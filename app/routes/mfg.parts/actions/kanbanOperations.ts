import { createCard, updateCard } from "~/lib/kanbanApi/cards";
import {
  createOnshapeApiClient,
  sessionInfo,
} from "~/lib/onshapeApi/generated-wrapper";
import type { ActionResponse } from "../utils/types";

/**
 * Handle adding a card to the Kanban board
 */
export async function handleAddKanbanCard(
  formData: FormData,
  request: Request
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

    // Get user information from Onshape
    let createdBy: string | undefined;
    try {
      const onshapeClient = await createOnshapeApiClient(request);

      // Use default responseStyle to get full response including status
      const fullResponse = await sessionInfo({
        client: onshapeClient,
        throwOnError: false,
      });

      console.log(
        "[Kanban] Full response:",
        JSON.stringify(fullResponse, null, 2)
      );

      // Check response status and errors
      if ((fullResponse as any).error) {
        console.error(
          "[Kanban] API returned error:",
          (fullResponse as any).error
        );
      }

      if ((fullResponse as any).response) {
        const response = (fullResponse as any).response;
        console.log("[Kanban] Response status:", response.status);
        console.log("[Kanban] Response ok:", response.ok);

        if (!response.ok) {
          try {
            const errorText = await response.clone().text();
            console.error(
              "[Kanban] API response not OK. Status:",
              response.status,
              "Error:",
              errorText
            );
          } catch (e) {
            console.error("[Kanban] Could not read error text:", e);
          }
        }
      }

      // Extract user data from response
      const userData = (fullResponse as any).data;
      console.log(
        "[Kanban] Extracted data:",
        JSON.stringify(userData, null, 2)
      );

      if (userData) {
        // The data should be SessionInfoResponses which has a 'default' property
        const user = userData.default || userData;

        if (user && typeof user === "object" && !Array.isArray(user)) {
          const firstName = user.firstName;
          const lastName = user.lastName;

          console.log(
            "[Kanban] First name:",
            firstName,
            "Last name:",
            lastName
          );
          console.log("[Kanban] User object keys:", Object.keys(user));

          // Combine firstName and lastName, handling cases where one might be missing
          const nameParts: string[] = [];
          if (firstName) nameParts.push(firstName);
          if (lastName) nameParts.push(lastName);
          createdBy = nameParts.length > 0 ? nameParts.join(" ") : undefined;

          console.log("[Kanban] Created by:", createdBy);
        } else {
          console.log("[Kanban] User data is not a valid object");
        }
      } else {
        console.log(
          "[Kanban] No data in response - API call may have failed or returned null"
        );
      }
    } catch (error) {
      // Log error but don't fail card creation if user info fetch fails
      console.error("[Kanban] Error fetching user info:", error);
      if (error instanceof Error) {
        console.error("[Kanban] Error message:", error.message);
        console.error("[Kanban] Error stack:", error.stack);
      }
    }

    // Create card directly
    const card = await createCard({
      title: partNumber,
      imageUrl,
      assignee: "Unassigned",
      material: "TBD",
      machine: "TBD",
      createdBy,
    });

    return { success: true, data: card };
  } catch (error) {
    console.error("[Kanban] Error adding card:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to add card to tracker",
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
      error: error instanceof Error ? error.message : "Failed to move card",
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
      error:
        error instanceof Error ? error.message : "Failed to update due date",
    };
  }
}
