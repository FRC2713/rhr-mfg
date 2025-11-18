import { getCards, createCard } from "~/lib/kanbanApi/cards";

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

    // Validate required field (only title is required)
    if (!body.title) {
      return Response.json(
        { error: "Missing required field: title" },
        { status: 400 }
      );
    }

    // Create the card
    const newCard = await createCard({
      id: body.id,
      title: body.title,
      imageUrl: body.imageUrl,
      assignee: body.assignee,
      material: body.material,
      machine: body.machine,
      dueDate: body.dueDate,
      content: body.content,
    });

    return Response.json({ card: newCard }, { status: 201 });
  } catch (error) {
    console.error("[KANBAN CARDS] Error creating card:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create card";
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

