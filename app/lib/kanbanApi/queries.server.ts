import "server-only";
import { getCards } from "./cards";
import { supabase } from "~/lib/supabase/client";
import type { KanbanColumn } from "~/api/kanban/config/route";
import type { KanbanCardRow } from "~/lib/supabase/database.types";

// Default columns
const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "backlog", title: "Backlog", position: 0 },
  { id: "in-progress", title: "In Progress", position: 1 },
  { id: "review", title: "Review", position: 2 },
  { id: "done", title: "Done", position: 3 },
];

/**
 * Server-side function to fetch kanban cards
 * Used for prefetching in server components
 */
export async function fetchKanbanCardsServer(): Promise<{
  cards: KanbanCardRow[];
}> {
  const result = await getCards();
  if (result.error) {
    console.error("[KANBAN CARDS] Error fetching cards:", result.error);
    return { cards: [] };
  }
  return { cards: result.cards };
}

/**
 * Server-side function to fetch kanban columns
 * Used for prefetching in server components
 */
export async function fetchKanbanColumnsServer(): Promise<KanbanColumn[]> {
  try {
    const { data, error } = await supabase
      .from("kanban_config")
      .select("columns")
      .eq("id", "default")
      .single();

    if (error || !data) {
      console.log("[KANBAN COLUMNS] No existing config found, using default");
      return DEFAULT_COLUMNS;
    }

    return data.columns as unknown as KanbanColumn[];
  } catch (error) {
    console.log("[KANBAN COLUMNS] Error fetching columns:", error);
    return DEFAULT_COLUMNS;
  }
}

