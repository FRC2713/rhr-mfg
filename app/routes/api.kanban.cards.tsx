import { put, head } from "@vercel/blob";
import type { KanbanCard, KanbanCardsData } from "./api.kanban.cards/types";
import type { KanbanConfig } from "./api.kanban.config";

const CARDS_BLOB_KEY = "kanban-cards.json";
const CONFIG_BLOB_KEY = "kanban-config.json";

async function getCards(): Promise<KanbanCard[]> {
  try {
    const response = await head(CARDS_BLOB_KEY, {
      token: process.env.RHR_MFG_DB_READ_WRITE_TOKEN,
    });

    if (response.url) {
      const cardsResponse = await fetch(response.url);
      const data = (await cardsResponse.json()) as KanbanCardsData;
      return data.cards;
    }
  } catch (error) {
    console.log("[KANBAN CARDS] No existing cards found, returning empty array");
  }

  return [];
}

async function saveCards(cards: KanbanCard[]): Promise<void> {
  const data: KanbanCardsData = { cards };
  const blob = await put(CARDS_BLOB_KEY, JSON.stringify(data), {
    access: "public",
    token: process.env.RHR_MFG_DB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log("[KANBAN CARDS] Saved cards to blob:", blob.url);
}

async function getColumnIdByPosition(position: number): Promise<string | null> {
  try {
    const response = await head(CONFIG_BLOB_KEY, {
      token: process.env.RHR_MFG_DB_READ_WRITE_TOKEN,
    });

    if (response.url) {
      const configResponse = await fetch(response.url);
      const config = (await configResponse.json()) as KanbanConfig;
      
      // Find column at the specified position
      const column = config.columns.find((col) => col.position === position);
      return column?.id || null;
    }
  } catch (error) {
    console.log("[KANBAN CARDS] Error fetching config for column lookup");
  }

  // Default to first column if config not found
  return "backlog";
}

export async function loader({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const columnId = url.searchParams.get("columnId");

    let cards = await getCards();

    // Filter by columnId if provided
    if (columnId) {
      cards = cards.filter((card) => card.columnId === columnId);
    }

    return Response.json({ cards });
  } catch (error) {
    console.error("[KANBAN CARDS] Error loading cards:", error);
    return Response.json({ cards: [] }, { status: 500 });
  }
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ["title", "imageUrl", "assignee", "material", "machine"];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return Response.json(
        { error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Get column ID for position 0
    const columnId = await getColumnIdByPosition(0);

    if (!columnId) {
      return Response.json(
        { error: "Could not determine target column" },
        { status: 500 }
      );
    }

    // Create the new card
    const now = new Date().toISOString();
    const newCard: KanbanCard = {
      id: body.id || `card-${Date.now()}`,
      columnId,
      title: body.title,
      imageUrl: body.imageUrl,
      assignee: body.assignee,
      dateCreated: now,
      dateUpdated: now,
      material: body.material,
      machine: body.machine,
    };

    // Get existing cards and add the new one
    const cards = await getCards();
    cards.push(newCard);

    // Save updated cards
    await saveCards(cards);

    return Response.json({ card: newCard }, { status: 201 });
  } catch (error) {
    console.error("[KANBAN CARDS] Error creating card:", error);
    return Response.json(
      { error: "Failed to create card" },
      { status: 500 }
    );
  }
}

