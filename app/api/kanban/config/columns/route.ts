import { NextResponse } from "next/server";
import { supabase } from "~/lib/supabase/client";
import type { KanbanColumn } from "../route";

// Default columns
const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "backlog", title: "Backlog", position: 0 },
  { id: "in-progress", title: "In Progress", position: 1 },
  { id: "review", title: "Review", position: 2 },
  { id: "done", title: "Done", position: 3 },
];

async function getColumns(): Promise<KanbanColumn[]> {
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

export async function GET() {
  try {
    const columns = await getColumns();
    return NextResponse.json(columns);
  } catch (error) {
    console.error("[KANBAN COLUMNS] Error loading columns:", error);
    return NextResponse.json(DEFAULT_COLUMNS, { status: 500 });
  }
}
