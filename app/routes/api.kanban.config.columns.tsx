import { head } from "@vercel/blob";
import type { KanbanConfig, KanbanColumn } from "./api.kanban.config";

const BLOB_KEY = "kanban-config.json";

// Default columns
const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "backlog", title: "Backlog", position: 0 },
  { id: "in-progress", title: "In Progress", position: 1 },
  { id: "review", title: "Review", position: 2 },
  { id: "done", title: "Done", position: 3 },
];

async function getColumns(): Promise<KanbanColumn[]> {
  try {
    // Check if config exists
    const response = await head(BLOB_KEY, {
      token: process.env.RHR_MFG_DB_READ_WRITE_TOKEN,
    });

    if (response.url) {
      // Fetch the config
      const configResponse = await fetch(response.url);
      const config = (await configResponse.json()) as KanbanConfig;
      return config.columns;
    }
  } catch (error) {
    console.log("[KANBAN COLUMNS] No existing config found, using default");
  }

  return DEFAULT_COLUMNS;
}

export async function loader() {
  try {
    const columns = await getColumns();
    return Response.json(columns);
  } catch (error) {
    console.error("[KANBAN COLUMNS] Error loading columns:", error);
    return Response.json(DEFAULT_COLUMNS, { status: 500 });
  }
}

