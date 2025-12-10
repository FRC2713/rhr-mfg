import { z } from "zod";
import { createCard, updateCard } from "~/lib/kanbanApi/cards";
import { logger } from "~/lib/logger";
import { onshapeApiRequest } from "~/lib/onshapeApi/auth";
import { getValidOnshapeToken } from "~/lib/tokenRefresh";
import type { ActionResponse } from "../utils/types";

/**
 * Onshape user response from /users/current endpoint
 */
interface OnshapeUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  name?: string;
}

/**
 * Zod schema for adding a card to the Kanban board
 */
const addCardSchema = z.object({
  partNumber: z.string().min(1, "Part number is required"),
  documentId: z.string().optional(),
  instanceType: z.string().default("w"),
  instanceId: z.string().optional(),
  elementId: z.string().optional(),
  partId: z.string().optional(),
});

/**
 * Zod schema for moving a card between columns
 */
const moveCardSchema = z.object({
  cardId: z.string().min(1, "Card ID is required"),
  columnId: z.string().min(1, "Column ID is required"),
});

/**
 * Zod schema for updating a card's due date
 */
const updateDueDateSchema = z.object({
  cardId: z.string().min(1, "Card ID is required"),
  dueDate: z.string().optional(),
});

/**
 * Extract string value from FormData safely
 * Returns undefined for File entries or null values
 */
function getStringValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (value === null || value instanceof File) {
    return undefined;
  }
  return value;
}

/**
 * Parse FormData into an object for Zod validation
 */
function formDataToObject(
  formData: FormData,
  keys: string[]
): Record<string, string | undefined> {
  const obj: Record<string, string | undefined> = {};
  for (const key of keys) {
    obj[key] = getStringValue(formData, key);
  }
  return obj;
}

/**
 * Fetch current user info from Onshape API
 */
async function fetchOnshapeUserInfo(
  request: Request
): Promise<string | undefined> {
  try {
    const accessToken = await getValidOnshapeToken(request);

    if (!accessToken) {
      logger.debug("[Kanban] No access token available");
      return undefined;
    }

    const response = await onshapeApiRequest(accessToken, "/users/current");

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => "Unable to read error");
      logger.error(
        `[Kanban] API response not OK. Status: ${response.status}, Error: ${errorText}`
      );
      return undefined;
    }

    const user = (await response.json()) as OnshapeUser;
    logger.debug("[Kanban] User data received");

    // Combine firstName and lastName
    const nameParts: string[] = [];
    if (user.firstName) nameParts.push(user.firstName);
    if (user.lastName) nameParts.push(user.lastName);

    return nameParts.length > 0 ? nameParts.join(" ") : undefined;
  } catch (error) {
    logger.error("[Kanban] Error fetching user info:", error);
    return undefined;
  }
}

/**
 * Handle adding a card to the Kanban board
 */
export async function handleAddKanbanCard(
  formData: FormData,
  request: Request
): Promise<ActionResponse> {
  // Parse and validate form data
  const rawData = formDataToObject(formData, [
    "partNumber",
    "documentId",
    "instanceType",
    "instanceId",
    "elementId",
    "partId",
  ]);

  const parseResult = addCardSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMessage = parseResult.error.issues
      .map((issue) => issue.message)
      .join(", ");
    return { success: false, error: errorMessage };
  }

  const data = parseResult.data;

  try {
    // Build image URL from Onshape thumbnail API if part metadata is provided
    let imageUrl = "";
    if (data.documentId && data.instanceId && data.elementId && data.partId) {
      const params = new URLSearchParams({
        documentId: data.documentId,
        instanceType: data.instanceType,
        instanceId: data.instanceId,
        elementId: data.elementId,
        partId: data.partId,
      });
      imageUrl = `/api/onshape/thumbnail?${params.toString()}`;
    }

    // Get user information from Onshape
    const createdBy = await fetchOnshapeUserInfo(request);

    // Create card
    const card = await createCard({
      title: data.partNumber,
      imageUrl,
      assignee: "Unassigned",
      material: "TBD",
      machine: "TBD",
      createdBy,
    });

    return { success: true, data: card };
  } catch (error) {
    logger.error("[Kanban] Error adding card:", error);
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
  // Parse and validate form data
  const rawData = formDataToObject(formData, ["cardId", "columnId"]);

  const parseResult = moveCardSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMessage = parseResult.error.issues
      .map((issue) => issue.message)
      .join(", ");
    return { success: false, error: errorMessage };
  }

  const { cardId, columnId } = parseResult.data;

  try {
    const card = await updateCard(cardId, { columnId });
    return { success: true, data: card };
  } catch (error) {
    logger.error("[Kanban] Error moving card:", error);
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
  // Parse and validate form data
  const rawData = formDataToObject(formData, ["cardId", "dueDate"]);

  const parseResult = updateDueDateSchema.safeParse(rawData);
  if (!parseResult.success) {
    const errorMessage = parseResult.error.issues
      .map((issue) => issue.message)
      .join(", ");
    return { success: false, error: errorMessage };
  }

  const { cardId, dueDate } = parseResult.data;

  try {
    const card = await updateCard(cardId, {
      dueDate: dueDate || undefined,
    });
    return { success: true, data: card };
  } catch (error) {
    logger.error("[Kanban] Error updating due date:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update due date",
    };
  }
}
