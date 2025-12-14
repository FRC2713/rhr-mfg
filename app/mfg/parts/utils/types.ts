// Re-export Kanban types for convenience

export type { KanbanColumn } from "~/api/kanban/config/route";

/**
 * Query parameters for the parts route
 */
export interface PartsQueryParams {
  documentId: string | null;
  instanceType: string;
  instanceId: string | null;
  elementId: string | null;
  elementType?: string | null;
}

/**
 * Action response type
 */
export interface ActionResponse {
  success: boolean;
  error?: string;
  data?: unknown;
  redirect?: string;
  headers?: {
    "Set-Cookie": string;
  };
}
