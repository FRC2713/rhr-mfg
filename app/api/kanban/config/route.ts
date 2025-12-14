import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase/client";

export interface KanbanColumn {
  id: string;
  title: string;
  position: number;
}

export interface KanbanConfig {
  columns: KanbanColumn[];
}

// Default configuration
const DEFAULT_CONFIG: KanbanConfig = {
  columns: [
    { id: "backlog", title: "Backlog", position: 0 },
    { id: "in-progress", title: "In Progress", position: 1 },
    { id: "review", title: "Review", position: 2 },
    { id: "done", title: "Done", position: 3 },
  ],
};

async function getConfig(): Promise<KanbanConfig> {
  try {
    const { data, error } = await supabase
      .from("kanban_config")
      .select("columns")
      .eq("id", "default")
      .single();

    if (error || !data) {
      console.log("[KANBAN CONFIG] No existing config found, using default");
      return DEFAULT_CONFIG;
    }

    return {
      columns: data.columns as unknown as KanbanColumn[],
    };
  } catch (error) {
    console.log("[KANBAN CONFIG] Error fetching config:", error);
    return DEFAULT_CONFIG;
  }
}

async function saveConfig(config: KanbanConfig): Promise<void> {
  const { error } = await supabase.from("kanban_config").upsert(
    {
      id: "default",
      // Cast columns array to Json type expected by Supabase
      columns: JSON.parse(JSON.stringify(config.columns)),
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    console.error("[KANBAN CONFIG] Error saving config:", error);
    throw new Error(`Failed to save config: ${error.message}`);
  }

  console.log("[KANBAN CONFIG] Saved config to database");
}

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("[KANBAN CONFIG] Error loading config:", error);
    return NextResponse.json(DEFAULT_CONFIG, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const config = (await request.json()) as KanbanConfig;

    // Validate the config
    if (!config.columns || !Array.isArray(config.columns)) {
      return NextResponse.json(
        { error: "Invalid config structure" },
        { status: 400 }
      );
    }

    // Save the config
    await saveConfig(config);

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("[KANBAN CONFIG] Error saving config:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save config";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
