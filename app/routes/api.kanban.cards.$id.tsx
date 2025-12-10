import { getCards, updateCard, deleteCard } from "~/lib/kanbanApi/cards";

export async function loader({ params }: { params: { id: string } }) {
  try {
    const result = await getCards();

    if (result.error) {
      console.error("[KANBAN CARD] Error loading cards:", result.error);
      return Response.json({ error: result.error }, { status: 500 });
    }

    const card = result.cards.find((c) => c.id === params.id);

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
    // PATCH - Update card
    if (method === "PATCH") {
      const updates = await request.json();
      const updatedCard = await updateCard(params.id, updates);
      return Response.json({ card: updatedCard });
    }

    // DELETE - Remove card
    if (method === "DELETE") {
      const deletedCard = await deleteCard(params.id);
      return Response.json({ card: deletedCard });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("[KANBAN CARD] Error in action:", error);
    const errorMessage = error instanceof Error ? error.message : "Operation failed";
    const statusCode = error instanceof Error && error.message === "Card not found" ? 404 : 500;
    return Response.json({ error: errorMessage }, { status: statusCode });
  }
}

