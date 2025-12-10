import type { Route } from "../../+types/mfg.parts";
import { handleAddKanbanCard, handleMoveKanbanCard, handleUpdateKanbanDueDate } from "./kanbanOperations";
import { handlePartNumberUpdate } from "./partNumberUpdate";
import { createErrorResponse } from "../utils/errorHandling";
import type { ActionResponse } from "../utils/types";

/**
 * Main action handler that routes to specific action handlers
 */
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("action")?.toString();

  // Handle Kanban card operations (addCard, moveCard, updateDueDate)
  if (actionType === "addCard" || actionType === "moveCard" || actionType === "updateDueDate") {
    try {
      let result: ActionResponse;
      if (actionType === "addCard") {
        result = await handleAddKanbanCard(formData, request);
      } else if (actionType === "moveCard") {
        result = await handleMoveKanbanCard(formData);
      } else if (actionType === "updateDueDate") {
        result = await handleUpdateKanbanDueDate(formData);
      } else {
        result = { success: false, error: "Unknown action type" };
      }

      // Return as JSON Response
      const status = result.success ? 200 : 400;
      const headers: HeadersInit = {};
      if (result.headers) {
        headers["Set-Cookie"] = result.headers["Set-Cookie"];
      }
      return Response.json(result, { status, headers });
    } catch (error: unknown) {
      console.error("Error in Kanban card operation:", error);
      const errorResponse = createErrorResponse(error, "Failed to perform card operation");
      return Response.json(errorResponse, { status: 500 });
    }
  }

  // Handle part number update (default/fallback)
  const result = await handlePartNumberUpdate(formData, request);
  const status = result.success ? 200 : 400;
  const headers: HeadersInit = {};
  if (result.headers) {
    headers["Set-Cookie"] = result.headers["Set-Cookie"];
  }
  return Response.json(result, { status, headers });
}

