// Re-export Kanban types for convenience

export type { KanbanColumn } from "~/api/kanban/config/route";

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
