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
          machine: string | null;
          due_date: string | null;
          content: string | null;
          created_by: string | null;
          quantity_per_robot: number | null;
          quantity_to_make: number | null;
          onshape_document_id: string | null;
          onshape_instance_type: string | null;
          onshape_instance_id: string | null;
          onshape_element_id: string | null;
          onshape_part_id: string | null;
          onshape_version_id: string | null;
        };
        Insert: {
          id: string;
          column_id: string;
          title: string;
          image_url?: string | null;
          assignee?: string | null;
          date_created: string;
          date_updated: string;
          machine?: string | null;
          due_date?: string | null;
          content?: string | null;
          created_by?: string | null;
          quantity_per_robot?: number | null;
          quantity_to_make?: number | null;
          onshape_document_id?: string | null;
          onshape_instance_type?: string | null;
          onshape_instance_id?: string | null;
          onshape_element_id?: string | null;
          onshape_part_id?: string | null;
          onshape_version_id?: string | null;
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
          quantity_per_robot?: number | null;
          quantity_to_make?: number | null;
          onshape_document_id?: string | null;
          onshape_instance_type?: string | null;
          onshape_instance_id?: string | null;
          onshape_element_id?: string | null;
          onshape_part_id?: string | null;
          onshape_version_id?: string | null;
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
      equipment: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          location: string | null;
          status: string | null;
          documentation_url: string | null;
          image_urls: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          location?: string | null;
          status?: string | null;
          documentation_url?: string | null;
          image_urls?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          location?: string | null;
          status?: string | null;
          documentation_url?: string | null;
          image_urls?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      processes: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      equipment_processes: {
        Row: {
          equipment_id: string;
          process_id: string;
        };
        Insert: {
          equipment_id: string;
          process_id: string;
        };
        Update: {
          equipment_id?: string;
          process_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "equipment_processes_equipment_id_fkey";
            columns: ["equipment_id"];
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipment_processes_process_id_fkey";
            columns: ["process_id"];
            referencedRelation: "processes";
            referencedColumns: ["id"];
          },
        ];
      };
      kanban_card_processes: {
        Row: {
          card_id: string;
          process_id: string;
        };
        Insert: {
          card_id: string;
          process_id: string;
        };
        Update: {
          card_id?: string;
          process_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kanban_card_processes_card_id_fkey";
            columns: ["card_id"];
            referencedRelation: "kanban_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kanban_card_processes_process_id_fkey";
            columns: ["process_id"];
            referencedRelation: "processes";
            referencedColumns: ["id"];
          },
        ];
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

export type EquipmentRow = Tables<"equipment">["Row"];
export type EquipmentInsert = Tables<"equipment">["Insert"];
export type EquipmentUpdate = Tables<"equipment">["Update"];

export type ProcessRow = Tables<"processes">["Row"];
export type ProcessInsert = Tables<"processes">["Insert"];
export type ProcessUpdate = Tables<"processes">["Update"];

export type EquipmentProcessRow = Tables<"equipment_processes">["Row"];
export type EquipmentProcessInsert = Tables<"equipment_processes">["Insert"];

export type KanbanCardProcessRow = Tables<"kanban_card_processes">["Row"];
export type KanbanCardProcessInsert = Tables<"kanban_card_processes">["Insert"];
