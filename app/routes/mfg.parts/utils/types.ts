// Re-export Kanban types for convenience
export type { KanbanCard } from "~/routes/api.kanban.cards/types";
export type { KanbanColumn } from "~/routes/api.kanban.config";

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

