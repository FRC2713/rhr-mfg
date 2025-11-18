import { put, head } from "@vercel/blob";

export interface KanbanColumn {
  id: string;
  title: string;
  position: number;
}

export interface KanbanConfig {
  columns: KanbanColumn[];
}

const BLOB_KEY = "kanban-config.json";

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
    // Check if config exists
    const response = await head(BLOB_KEY, {
      token: process.env.RHR_MFG_DB_READ_WRITE_TOKEN,
    });

    if (response.url) {
      // Fetch the config
      const configResponse = await fetch(response.url);
      const config = await configResponse.json();
      return config as KanbanConfig;
    }
  } catch (error) {
    console.log("[KANBAN CONFIG] No existing config found, using default");
  }

  return DEFAULT_CONFIG;
}

async function saveConfig(config: KanbanConfig): Promise<void> {
  const blob = await put(BLOB_KEY, JSON.stringify(config), {
    access: "public",
    token: process.env.RHR_MFG_DB_READ_WRITE_TOKEN,
    addRandomSuffix: false, // Keep the same key
    allowOverwrite: true, // Allow updating the existing config
  });

  console.log("[KANBAN CONFIG] Saved config to blob:", blob.url);
}

export async function loader() {
  try {
    const config = await getConfig();
    return Response.json(config);
  } catch (error) {
    console.error("[KANBAN CONFIG] Error loading config:", error);
    return Response.json(DEFAULT_CONFIG, { status: 500 });
  }
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "PUT") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const config = (await request.json()) as KanbanConfig;

    // Validate the config
    if (!config.columns || !Array.isArray(config.columns)) {
      return Response.json(
        { error: "Invalid config structure" },
        { status: 400 }
      );
    }

    // Save the config
    await saveConfig(config);

    return Response.json({ success: true, config });
  } catch (error) {
    console.error("[KANBAN CONFIG] Error saving config:", error);
    return Response.json({ error: "Failed to save config" }, { status: 500 });
  }
}
