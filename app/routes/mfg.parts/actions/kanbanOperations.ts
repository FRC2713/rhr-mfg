import type { ActionResponse } from "../utils/types";

/**
 * Handle adding a card to the Kanban board
 */
export async function handleAddKanbanCard(
  formData: FormData
): Promise<ActionResponse> {
  const partNumber = formData.get("partNumber")?.toString();
  if (!partNumber) {
    return { success: false, error: "Part number is required" };
  }

  try {
    // Prepare card data
    const documentId = formData.get("documentId")?.toString();
    const instanceId = formData.get("instanceId")?.toString();
    const elementId = formData.get("elementId")?.toString();
    const partId = formData.get("partId")?.toString();

    // Build image URL from Onshape thumbnail API if part metadata is provided
    let imageUrl = "";
    if (documentId && instanceId && elementId && partId) {
      const params = new URLSearchParams({
        documentId,
        instanceType: formData.get("instanceType")?.toString() || "w",
        instanceId,
        elementId,
        partId,
      });
      imageUrl = `/api/onshape/thumbnail?${params.toString()}`;
    }

    // Create card via API
    const response = await fetch("/api/kanban/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: partNumber,
        imageUrl,
        assignee: "Unassigned",
        material: "TBD",
        machine: "TBD",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Failed to create card" };
    }

    const result = await response.json();
    return { success: true, data: result.card };
  } catch (error) {
    console.error("[Kanban] Error adding card:", error);
    return { success: false, error: "Failed to add card to tracker" };
  }
}

/**
 * Handle moving a card between columns
 */
export async function handleMoveKanbanCard(
  formData: FormData
): Promise<ActionResponse> {
  const cardId = formData.get("cardId")?.toString();
  const columnId = formData.get("columnId")?.toString();

  if (!cardId || !columnId) {
    return { success: false, error: "Card ID and column ID are required" };
  }

  try {
    // Update card via API
    const response = await fetch(`/api/kanban/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        columnId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Failed to move card" };
    }

    const result = await response.json();
    return { success: true, data: result.card };
  } catch (error) {
    console.error("[Kanban] Error moving card:", error);
    return { success: false, error: "Failed to move card" };
  }
}

/**
 * Handle updating a card's due date
 */
export async function handleUpdateKanbanDueDate(
  formData: FormData
): Promise<ActionResponse> {
  const cardId = formData.get("cardId")?.toString();
  const dueDate = formData.get("dueDate")?.toString();

  if (!cardId) {
    return { success: false, error: "Card ID is required" };
  }

  try {
    // Update card via API
    const response = await fetch(`/api/kanban/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dueDate: dueDate || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Failed to update due date" };
    }

    const result = await response.json();
    return { success: true, data: result.card };
  } catch (error) {
    console.error("[Kanban] Error updating due date:", error);
    return { success: false, error: "Failed to update due date" };
  }
}

