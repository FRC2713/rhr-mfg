/**
 * Supabase Database Types
 *
 * These types represent the database schema for type-safe Supabase queries.
 * In a production setup, these would be generated using:
 * `npx supabase gen types typescript --project-id <project-id> > database.types.ts`
 */

/**
 * Kanban column configuration stored as JSON in the database
 */
export interface KanbanColumnConfig {
  id: string;
  title: string;
  position: number;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      kanban_cards: {
        Row: {
          id: string;
          column_id: string;
          title: string;
          image_url: string | null;
          assignee: string | null;
          date_created: string;
          date_updated: string;
          material: string | null;
          machine: string | null;
          due_date: string | null;
          content: string | null;
          created_by: string | null;
        };
        Insert: {
          id: string;
          column_id: string;
          title: string;
          image_url?: string | null;
          assignee?: string | null;
          date_created: string;
          date_updated: string;
          material?: string | null;
          machine?: string | null;
          due_date?: string | null;
          content?: string | null;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          column_id?: string;
          title?: string;
          image_url?: string | null;
          assignee?: string | null;
          date_created?: string;
          date_updated?: string;
          material?: string | null;
          machine?: string | null;
          due_date?: string | null;
          content?: string | null;
          created_by?: string | null;
        };
        Relationships: [];
      };
      kanban_config: {
        Row: {
          id: string;
          columns: Json;
        };
        Insert: {
          id: string;
          columns: Json;
        };
        Update: {
          id?: string;
          columns?: Json;
        };
        Relationships: [];
      };
      users: {
        Row: {
          onshape_user_id: string;
          name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          onshape_user_id: string;
          name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          onshape_user_id?: string;
          name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

/**
 * Helper types for easier access to table types
 */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T];

export type KanbanCardRow = Tables<"kanban_cards">["Row"];
export type KanbanCardInsert = Tables<"kanban_cards">["Insert"];
export type KanbanCardUpdate = Tables<"kanban_cards">["Update"];

export type KanbanConfigRow = Tables<"kanban_config">["Row"];
export type KanbanConfigInsert = Tables<"kanban_config">["Insert"];

export type UserRow = Tables<"users">["Row"];
export type UserInsert = Tables<"users">["Insert"];
export type UserUpdate = Tables<"users">["Update"];
