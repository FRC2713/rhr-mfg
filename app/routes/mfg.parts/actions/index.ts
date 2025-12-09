import type { Route } from "../../+types/mfg.parts";
import { handleAddKanbanCard, handleMoveKanbanCard, handleUpdateKanbanDueDate } from "./kanbanOperations";
import { handlePartNumberUpdate } from "./partNumberUpdate";
import { createErrorResponse } from "../utils/errorHandling";

/**
 * Main action handler that routes to specific action handlers
 */
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("action")?.toString();

  // Handle Kanban card operations (addCard, moveCard, updateDueDate)
  if (actionType === "addCard" || actionType === "moveCard" || actionType === "updateDueDate") {
    try {
      if (actionType === "addCard") {
        return await handleAddKanbanCard(formData, request);
      } else if (actionType === "moveCard") {
        return await handleMoveKanbanCard(formData);
      } else if (actionType === "updateDueDate") {
        return await handleUpdateKanbanDueDate(formData);
      }
    } catch (error: unknown) {
      console.error("Error in Kanban card operation:", error);
      return createErrorResponse(error, "Failed to perform card operation");
    }
  }

  // Handle part number update (default/fallback)
  return await handlePartNumberUpdate(formData, request);
}

