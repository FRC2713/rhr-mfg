import { put, head } from "@vercel/blob";
import type { KanbanCard, KanbanCardsData } from "./api.kanban.cards/types";

const CARDS_BLOB_KEY = "kanban-cards.json";

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
    console.log("[KANBAN CARDS] No existing cards found");
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

export async function loader({ params }: { params: { id: string } }) {
  try {
    const cards = await getCards();
    const card = cards.find((c) => c.id === params.id);

    if (!card) {
      return Response.json({ error: "Card not found" }, { status: 404 });
    }

    return Response.json({ card });
  } catch (error) {
    console.error("[KANBAN CARD] Error loading card:", error);
    return Response.json({ error: "Failed to load card" }, { status: 500 });
  }
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const method = request.method;

  try {
    const cards = await getCards();
    const cardIndex = cards.findIndex((c) => c.id === params.id);

    if (cardIndex === -1) {
      return Response.json({ error: "Card not found" }, { status: 404 });
    }

    // PATCH - Update card
    if (method === "PATCH") {
      const updates = await request.json();

      // Update the card with new values
      const updatedCard: KanbanCard = {
        ...cards[cardIndex],
        ...updates,
        id: cards[cardIndex].id, // Ensure ID doesn't change
        dateUpdated: new Date().toISOString(), // Always update timestamp
      };

      cards[cardIndex] = updatedCard;
      await saveCards(cards);

      return Response.json({ card: updatedCard });
    }

    // DELETE - Remove card
    if (method === "DELETE") {
      const deletedCard = cards[cardIndex];
      cards.splice(cardIndex, 1);
      await saveCards(cards);

      return Response.json({ card: deletedCard });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("[KANBAN CARD] Error in action:", error);
    return Response.json({ error: "Operation failed" }, { status: 500 });
  }
}

