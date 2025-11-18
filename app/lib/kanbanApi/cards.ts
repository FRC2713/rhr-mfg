import { put, head } from "@vercel/blob";
import type { KanbanCard, KanbanCardsData } from "~/routes/api.kanban.cards/types";
import type { KanbanConfig } from "~/routes/api.kanban.config";

const CARDS_BLOB_KEY = "kanban-cards.json";
const CONFIG_BLOB_KEY = "kanban-config.json";

/**
 * Get all cards from Vercel Blob storage
 */
export async function getCards(): Promise<KanbanCard[]> {
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

/**
 * Save cards to Vercel Blob storage
 */
export async function saveCards(cards: KanbanCard[]): Promise<void> {
  const data: KanbanCardsData = { cards };
  const blob = await put(CARDS_BLOB_KEY, JSON.stringify(data), {
    access: "public",
    token: process.env.RHR_MFG_DB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log("[KANBAN CARDS] Saved cards to blob:", blob.url);
}

/**
 * Get a column ID by its position
 */
export async function getColumnIdByPosition(position: number): Promise<string | null> {
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
}): Promise<KanbanCard> {
  // Get column ID for position 0
  const columnId = await getColumnIdByPosition(0);

  if (!columnId) {
    throw new Error("Could not determine target column");
  }

  // Create the new card
  const now = new Date().toISOString();
  const newCard: KanbanCard = {
    id: cardData.id || `card-${Date.now()}`,
    columnId,
    title: cardData.title,
    imageUrl: cardData.imageUrl,
    assignee: cardData.assignee,
    dateCreated: now,
    dateUpdated: now,
    material: cardData.material,
    machine: cardData.machine,
    dueDate: cardData.dueDate,
    content: cardData.content,
  };

  // Get existing cards and add the new one
  const cards = await getCards();
  cards.push(newCard);

  // Save updated cards
  await saveCards(cards);

  return newCard;
}

/**
 * Update an existing Kanban card
 */
export async function updateCard(
  cardId: string,
  updates: Partial<Omit<KanbanCard, "id" | "dateCreated">>
): Promise<KanbanCard> {
  const cards = await getCards();
  const cardIndex = cards.findIndex((c) => c.id === cardId);

  if (cardIndex === -1) {
    throw new Error("Card not found");
  }

  // Update the card with new values
  const updatedCard: KanbanCard = {
    ...cards[cardIndex],
    ...updates,
    id: cards[cardIndex].id, // Ensure ID doesn't change
    dateUpdated: new Date().toISOString(), // Always update timestamp
  };

  cards[cardIndex] = updatedCard;
  await saveCards(cards);

  return updatedCard;
}

/**
 * Delete a Kanban card
 */
export async function deleteCard(cardId: string): Promise<KanbanCard> {
  const cards = await getCards();
  const cardIndex = cards.findIndex((c) => c.id === cardId);

  if (cardIndex === -1) {
    throw new Error("Card not found");
  }

  const deletedCard = cards[cardIndex];
  cards.splice(cardIndex, 1);
  await saveCards(cards);

  return deletedCard;
}

