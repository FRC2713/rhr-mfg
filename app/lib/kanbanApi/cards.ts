import { supabase } from "~/lib/supabase/client";
import type {
  KanbanCardRow,
  KanbanColumnConfig,
  ProcessRow,
} from "~/lib/supabase/database.types";

/**
 * Result type for getCards to distinguish errors from empty results
 */
export interface GetCardsResult {
  cards: KanbanCardRow[];
  error?: string;
}

/**
 * Get all cards from Supabase database with processes
 * Returns both cards and potential error for proper error handling
 */
export async function getCards(): Promise<GetCardsResult> {
  try {
    const { data, error } = await supabase
      .from("kanban_cards")
      .select(`
        *,
        kanban_card_processes (
          process_id,
          processes (*)
        )
      `)
      .order("date_created", { ascending: true });

    if (error) {
      console.error("[KANBAN CARDS] Error fetching cards:", error);
      return { cards: [], error: error.message };
    }

    // Transform the data to include processes as a flat array
    const cardsWithProcesses = (data || []).map((item: any) => {
      const processes = (item.kanban_card_processes || []).map(
        (kcp: any) => kcp.processes
      );
      const { kanban_card_processes, ...card } = item;
      return {
        ...card,
        processes,
      };
    });

    return { cards: cardsWithProcesses };
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
  processIds?: string[];
  quantityPerRobot?: number;
  quantityToMake?: number;
  id?: string;
  createdBy?: string;
}

/**
 * Create a new Kanban card
 */
export async function createCard(
  cardData: CreateCardInput
): Promise<KanbanCardRow> {
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
      quantity_per_robot: cardData.quantityPerRobot ?? null,
      quantity_to_make: cardData.quantityToMake ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[KANBAN CARDS] Error creating card:", error);
    throw new Error(`Failed to create card: ${error.message}`);
  }

  // Associate processes if provided
  if (cardData.processIds && cardData.processIds.length > 0) {
    await setCardProcesses(cardId, cardData.processIds);
  }

  return data;
}

/**
 * Update an existing Kanban card
 */
export async function updateCard(
  cardId: string,
  updates: Partial<Omit<KanbanCardRow, "id" | "date_created">>
): Promise<KanbanCardRow> {
  const { data, error } = await supabase
    .from("kanban_cards")
    .update(updates)
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

  return data;
}

/**
 * Delete a Kanban card
 * Also deletes the associated image from Supabase Storage if it exists
 */
export async function deleteCard(cardId: string): Promise<KanbanCardRow> {
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

  // Now delete the card
  const { error: deleteError } = await supabase
    .from("kanban_cards")
    .delete()
    .eq("id", cardId);

  if (deleteError) {
    console.error("[KANBAN CARDS] Error deleting card:", deleteError);
    throw new Error(`Failed to delete card: ${deleteError.message}`);
  }

  return cardData;
}

/**
 * Get processes for a kanban card
 */
export async function getCardProcesses(
  cardId: string
): Promise<ProcessRow[]> {
  try {
    const { data, error } = await supabase
      .from("kanban_card_processes")
      .select("process_id, processes (*)")
      .eq("card_id", cardId);

    if (error) {
      console.error("[KANBAN CARDS] Error fetching card processes:", error);
      throw new Error(`Failed to fetch card processes: ${error.message}`);
    }

    return (data || []).map((item: any) => item.processes);
  } catch (error) {
    console.error("[KANBAN CARDS] Error fetching card processes:", error);
    throw error;
  }
}

/**
 * Set processes for a kanban card (replaces existing)
 */
export async function setCardProcesses(
  cardId: string,
  processIds: string[]
): Promise<void> {
  try {
    // First, delete all existing process associations
    const { error: deleteError } = await supabase
      .from("kanban_card_processes")
      .delete()
      .eq("card_id", cardId);

    if (deleteError) {
      console.error(
        "[KANBAN CARDS] Error deleting card processes:",
        deleteError
      );
      throw new Error(
        `Failed to delete card processes: ${deleteError.message}`
      );
    }

    // Then, insert new associations
    if (processIds.length > 0) {
      const cardProcesses = processIds.map((processId) => ({
        card_id: cardId,
        process_id: processId,
      }));

      const { error: insertError } = await supabase
        .from("kanban_card_processes")
        .insert(cardProcesses);

      if (insertError) {
        console.error(
          "[KANBAN CARDS] Error inserting card processes:",
          insertError
        );
        throw new Error(
          `Failed to insert card processes: ${insertError.message}`
        );
      }
    }
  } catch (error) {
    console.error("[KANBAN CARDS] Error setting card processes:", error);
    throw error;
  }
}
