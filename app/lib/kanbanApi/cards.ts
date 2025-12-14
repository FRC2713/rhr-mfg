import type { KanbanCard } from "~/api/kanban/cards/types";
import { supabase } from "~/lib/supabase/client";
import type {
  KanbanCardRow,
  KanbanCardUpdate,
  KanbanColumnConfig,
} from "~/lib/supabase/database.types";
import { deleteImageFromSupabase } from "./images";

/**
 * Maps a database row (snake_case) to a KanbanCard (camelCase)
 */
function mapRowToCard(row: KanbanCardRow): KanbanCard {
  return {
    id: row.id,
    columnId: row.column_id,
    title: row.title,
    imageUrl: row.image_url ?? undefined,
    assignee: row.assignee ?? undefined,
    dateCreated: row.date_created,
    dateUpdated: row.date_updated,
    material: row.material ?? undefined,
    machine: row.machine ?? undefined,
    dueDate: row.due_date ?? undefined,
    content: row.content ?? undefined,
    createdBy: row.created_by ?? undefined,
  };
}

/**
 * Result type for getCards to distinguish errors from empty results
 */
export interface GetCardsResult {
  cards: KanbanCard[];
  error?: string;
}

/**
 * Get all cards from Supabase database
 * Returns both cards and potential error for proper error handling
 */
export async function getCards(): Promise<GetCardsResult> {
  try {
    const { data, error } = await supabase
      .from("kanban_cards")
      .select("*")
      .order("date_created", { ascending: true });

    if (error) {
      console.error("[KANBAN CARDS] Error fetching cards:", error);
      return { cards: [], error: error.message };
    }

    return { cards: (data || []).map(mapRowToCard) };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error fetching cards";
    console.error("[KANBAN CARDS] Error fetching cards:", message);
    return { cards: [], error: message };
  }
}

/**
 * Get a column ID by its position
 */
export async function getColumnIdByPosition(
  position: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("kanban_config")
      .select("columns")
      .eq("id", "default")
      .single();

    if (error || !data) {
      console.log("[KANBAN CARDS] No config found, using default column");
      return "backlog";
    }

    const columns = data.columns as unknown as KanbanColumnConfig[];
    const column = columns.find((col) => col.position === position);
    return column?.id || "backlog";
  } catch (error) {
    console.log("[KANBAN CARDS] Error fetching config for column lookup");
    return "backlog";
  }
}

/**
 * Input type for creating a card
 */
export interface CreateCardInput {
  title: string;
  imageUrl?: string;
  assignee?: string;
  material?: string;
  machine?: string;
  dueDate?: string;
  content?: string;
  id?: string;
  createdBy?: string;
}

/**
 * Create a new Kanban card
 */
export async function createCard(
  cardData: CreateCardInput
): Promise<KanbanCard> {
  // Get column ID for position 0
  const columnId = await getColumnIdByPosition(0);

  if (!columnId) {
    throw new Error("Could not determine target column");
  }

  // Create the new card
  const now = new Date().toISOString();
  const cardId = cardData.id || `card-${Date.now()}`;

  const { data, error } = await supabase
    .from("kanban_cards")
    .insert({
      id: cardId,
      column_id: columnId,
      title: cardData.title,
      image_url: cardData.imageUrl ?? null,
      assignee: cardData.assignee ?? null,
      date_created: now,
      date_updated: now,
      material: cardData.material ?? null,
      machine: cardData.machine ?? null,
      due_date: cardData.dueDate ?? null,
      content: cardData.content ?? null,
      created_by: cardData.createdBy ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[KANBAN CARDS] Error creating card:", error);
    throw new Error(`Failed to create card: ${error.message}`);
  }

  return mapRowToCard(data);
}

/**
 * Build database update object from camelCase updates
 */
function buildDbUpdates(
  updates: Partial<Omit<KanbanCard, "id" | "dateCreated">>
): KanbanCardUpdate {
  const dbUpdates: KanbanCardUpdate = {
    date_updated: new Date().toISOString(),
  };

  if (updates.columnId !== undefined) dbUpdates.column_id = updates.columnId;
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.imageUrl !== undefined)
    dbUpdates.image_url = updates.imageUrl ?? null;
  if (updates.assignee !== undefined)
    dbUpdates.assignee = updates.assignee ?? null;
  if (updates.material !== undefined)
    dbUpdates.material = updates.material ?? null;
  if (updates.machine !== undefined)
    dbUpdates.machine = updates.machine ?? null;
  if (updates.dueDate !== undefined)
    dbUpdates.due_date = updates.dueDate ?? null;
  if (updates.content !== undefined)
    dbUpdates.content = updates.content ?? null;

  return dbUpdates;
}

/**
 * Update an existing Kanban card
 */
export async function updateCard(
  cardId: string,
  updates: Partial<Omit<KanbanCard, "id" | "dateCreated">>
): Promise<KanbanCard> {
  const dbUpdates = buildDbUpdates(updates);

  const { data, error } = await supabase
    .from("kanban_cards")
    .update(dbUpdates)
    .eq("id", cardId)
    .select()
    .single();

  if (error) {
    console.error("[KANBAN CARDS] Error updating card:", error);
    if (error.code === "PGRST116") {
      throw new Error("Card not found");
    }
    throw new Error(`Failed to update card: ${error.message}`);
  }

  if (!data) {
    throw new Error("Card not found");
  }

  return mapRowToCard(data);
}

/**
 * Delete a Kanban card
 * Also deletes the associated image from Supabase Storage if it exists
 */
export async function deleteCard(cardId: string): Promise<KanbanCard> {
  // First, fetch the card to get the imageUrl before deletion
  const { data: cardData, error: fetchError } = await supabase
    .from("kanban_cards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (fetchError) {
    console.error(
      "[KANBAN CARDS] Error fetching card for deletion:",
      fetchError
    );
    if (fetchError.code === "PGRST116") {
      throw new Error("Card not found");
    }
    throw new Error(`Failed to fetch card: ${fetchError.message}`);
  }

  if (!cardData) {
    throw new Error("Card not found");
  }

  const card = mapRowToCard(cardData);

  // Delete the associated image from Supabase Storage if it exists
  await deleteImageFromSupabase(card.imageUrl);

  // Now delete the card
  const { error: deleteError } = await supabase
    .from("kanban_cards")
    .delete()
    .eq("id", cardId);

  if (deleteError) {
    console.error("[KANBAN CARDS] Error deleting card:", deleteError);
    throw new Error(`Failed to delete card: ${deleteError.message}`);
  }

  return card;
}
