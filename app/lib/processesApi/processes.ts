import { supabase } from "~/lib/supabase/client";
import type { ProcessRow, ProcessInsert, ProcessUpdate } from "~/lib/supabase/database.types";

/**
 * Result type for getProcesses to distinguish errors from empty results
 */
export interface GetProcessesResult {
  processes: ProcessRow[];
  error?: string;
}

/**
 * Get all processes from Supabase database
 * Returns both processes and potential error for proper error handling
 */
export async function getProcesses(): Promise<GetProcessesResult> {
  try {
    const { data, error } = await supabase
      .from("processes")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("[PROCESSES] Error fetching processes:", error);
      return { processes: [], error: error.message };
    }

    return { processes: data || [] };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error fetching processes";
    console.error("[PROCESSES] Error fetching processes:", message);
    return { processes: [], error: message };
  }
}

/**
 * Get a single process by ID
 */
export async function getProcessById(
  id: string
): Promise<ProcessRow | null> {
  try {
    const { data, error } = await supabase
      .from("processes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[PROCESSES] Error fetching process:", error);
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch process: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("[PROCESSES] Error fetching process:", error);
    throw error;
  }
}

/**
 * Create a new process
 */
export async function createProcess(
  processData: ProcessInsert
): Promise<ProcessRow> {
  const now = new Date().toISOString();
  const processId =
    processData.id ||
    `process-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const { data, error } = await supabase
    .from("processes")
    .insert({
      id: processId,
      name: processData.name,
      description: processData.description ?? null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error("[PROCESSES] Error creating process:", error);
    throw new Error(`Failed to create process: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing process
 */
export async function updateProcess(
  processId: string,
  updates: ProcessUpdate
): Promise<ProcessRow> {
  const { data, error } = await supabase
    .from("processes")
    .update(updates)
    .eq("id", processId)
    .select()
    .single();

  if (error) {
    console.error("[PROCESSES] Error updating process:", error);
    if (error.code === "PGRST116") {
      throw new Error("Process not found");
    }
    throw new Error(`Failed to update process: ${error.message}`);
  }

  if (!data) {
    throw new Error("Process not found");
  }

  return data;
}

/**
 * Delete a process
 */
export async function deleteProcess(processId: string): Promise<ProcessRow> {
  // First, fetch the process before deletion
  const { data: processData, error: fetchError } = await supabase
    .from("processes")
    .select("*")
    .eq("id", processId)
    .single();

  if (fetchError) {
    console.error(
      "[PROCESSES] Error fetching process for deletion:",
      fetchError
    );
    if (fetchError.code === "PGRST116") {
      throw new Error("Process not found");
    }
    throw new Error(`Failed to fetch process: ${fetchError.message}`);
  }

  if (!processData) {
    throw new Error("Process not found");
  }

  // Now delete the process (cascade will handle junction tables)
  const { error: deleteError } = await supabase
    .from("processes")
    .delete()
    .eq("id", processId);

  if (deleteError) {
    console.error("[PROCESSES] Error deleting process:", deleteError);
    throw new Error(`Failed to delete process: ${deleteError.message}`);
  }

  return processData;
}

