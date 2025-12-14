import { NextRequest, NextResponse } from "next/server";
import { deleteCard, getCards, updateCard } from "~/lib/kanbanApi/cards";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const result = await getCards();

    if (result.error) {
      console.error("[KANBAN CARD] Error loading cards:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const card = result.cards.find((c) => c.id === id);

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({ card });
  } catch (error) {
    console.error("[KANBAN CARD] Error loading card:", error);
    return NextResponse.json({ error: "Failed to load card" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const updates = await request.json();
    const updatedCard = await updateCard(id, updates);
    return NextResponse.json({ card: updatedCard });
  } catch (error) {
    console.error("[KANBAN CARD] Error in action:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Operation failed";
    const statusCode =
      error instanceof Error && error.message === "Card not found" ? 404 : 500;
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const deletedCard = await deleteCard(id);
    return NextResponse.json({ card: deletedCard });
  } catch (error) {
    console.error("[KANBAN CARD] Error in action:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Operation failed";
    const statusCode =
      error instanceof Error && error.message === "Card not found" ? 404 : 500;
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
