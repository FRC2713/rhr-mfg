import { supabase } from "~/lib/supabase/client";
import type { KanbanCard } from "~/routes/api.kanban.cards/types";
import type { KanbanConfig } from "~/routes/api.kanban.config";

/**
 * Get all cards from Supabase database
 */
export async function getCards(): Promise<KanbanCard[]> {
  try {
    const { data, error } = await supabase
      .from("kanban_cards")
      .select("*")
      .order("date_created", { ascending: true });

    if (error) {
      console.error("[KANBAN CARDS] Error fetching cards:", error);
      return [];
    }

    // Map database columns (snake_case) to TypeScript interface (camelCase)
    return (data || []).map((row) => ({
      id: row.id,
      columnId: row.column_id,
      title: row.title,
      imageUrl: row.image_url,
      assignee: row.assignee,
      dateCreated: row.date_created,
      dateUpdated: row.date_updated,
      material: row.material,
      machine: row.machine,
      dueDate: row.due_date,
      content: row.content,
      createdBy: row.created_by,
    }));
  } catch (error) {
    console.error("[KANBAN CARDS] Error fetching cards:", error);
    return [];
  }
}

/**
 * Get a column ID by its position
 */
export async function getColumnIdByPosition(position: number): Promise<string | null> {
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

    const config = data.columns as KanbanConfig["columns"];
    const column = config.find((col) => col.position === position);
    return column?.id || "backlog";
  } catch (error) {
    console.log("[KANBAN CARDS] Error fetching config for column lookup");
    return "backlog";
  }
}

/**
 * Create a new Kanban card
 */
export async function createCard(cardData: {
  title: string;
  imageUrl?: string;
  assignee?: string;
  material?: string;
  machine?: string;
  dueDate?: string;
  content?: string;
  id?: string;
  createdBy?: string;
}): Promise<KanbanCard> {
  // Get column ID for position 0
  const columnId = await getColumnIdByPosition(0);

  if (!columnId) {
    throw new Error("Could not determine target column");
  }

  // Create the new card
  const now = new Date().toISOString();
  const cardId = cardData.id || `card-${Date.now()}`;

  // Map TypeScript interface (camelCase) to database columns (snake_case)
  const { data, error } = await supabase
    .from("kanban_cards")
    .insert({
      id: cardId,
      column_id: columnId,
      title: cardData.title,
      image_url: cardData.imageUrl,
      assignee: cardData.assignee,
      date_created: now,
      date_updated: now,
      material: cardData.material,
      machine: cardData.machine,
      due_date: cardData.dueDate,
      content: cardData.content,
      created_by: cardData.createdBy,
    })
    .select()
    .single();

  if (error) {
    console.error("[KANBAN CARDS] Error creating card:", error);
    throw new Error(`Failed to create card: ${error.message}`);
  }

  // Map back to TypeScript interface
  return {
    id: data.id,
    columnId: data.column_id,
    title: data.title,
    imageUrl: data.image_url,
    assignee: data.assignee,
    dateCreated: data.date_created,
    dateUpdated: data.date_updated,
    material: data.material,
    machine: data.machine,
    dueDate: data.due_date,
    content: data.content,
    createdBy: data.created_by,
  };
}

/**
 * Update an existing Kanban card
 */
export async function updateCard(
  cardId: string,
  updates: Partial<Omit<KanbanCard, "id" | "dateCreated">>
): Promise<KanbanCard> {
  // Map TypeScript interface updates to database columns
  const dbUpdates: Record<string, unknown> = {
    date_updated: new Date().toISOString(),
  };

  if (updates.columnId !== undefined) dbUpdates.column_id = updates.columnId;
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
  if (updates.assignee !== undefined) dbUpdates.assignee = updates.assignee;
  if (updates.material !== undefined) dbUpdates.material = updates.material;
  if (updates.machine !== undefined) dbUpdates.machine = updates.machine;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  if (updates.content !== undefined) dbUpdates.content = updates.content;

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

  // Map back to TypeScript interface
  return {
    id: data.id,
    columnId: data.column_id,
    title: data.title,
    imageUrl: data.image_url,
    assignee: data.assignee,
    dateCreated: data.date_created,
    dateUpdated: data.date_updated,
    material: data.material,
    machine: data.machine,
    dueDate: data.due_date,
    content: data.content,
    createdBy: data.created_by,
  };
}

/**
 * Delete a Kanban card
 */
export async function deleteCard(cardId: string): Promise<KanbanCard> {
  // First, get the card to return it
  const { data: cardData, error: fetchError } = await supabase
    .from("kanban_cards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (fetchError || !cardData) {
    throw new Error("Card not found");
  }

  // Delete the card
  const { error } = await supabase.from("kanban_cards").delete().eq("id", cardId);

  if (error) {
    console.error("[KANBAN CARDS] Error deleting card:", error);
    throw new Error(`Failed to delete card: ${error.message}`);
  }

  // Map back to TypeScript interface
  return {
    id: cardData.id,
    columnId: cardData.column_id,
    title: cardData.title,
    imageUrl: cardData.image_url,
    assignee: cardData.assignee,
    dateCreated: cardData.date_created,
    dateUpdated: cardData.date_updated,
    material: cardData.material,
    machine: cardData.machine,
    dueDate: cardData.due_date,
    content: cardData.content,
    createdBy: cardData.created_by,
  };
}
