import type { ActionResponse } from "../utils/types";
import { createCard, updateCard } from "~/lib/kanbanApi/cards";

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

    // Create card directly
    const card = await createCard({
      title: partNumber,
      imageUrl,
      assignee: "Unassigned",
      material: "TBD",
      machine: "TBD",
    });

    return { success: true, data: card };
  } catch (error) {
    console.error("[Kanban] Error adding card:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to add card to tracker" 
    };
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
    // Update card directly
    const card = await updateCard(cardId, { columnId });
    return { success: true, data: card };
  } catch (error) {
    console.error("[Kanban] Error moving card:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to move card" 
    };
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
    // Update card directly
    const card = await updateCard(cardId, {
      dueDate: dueDate || undefined,
    });
    return { success: true, data: card };
  } catch (error) {
    console.error("[Kanban] Error updating due date:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update due date" 
    };
  }
}

