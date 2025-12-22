import { supabase } from "~/lib/supabase/client";
import type {
  EquipmentRow,
  ProcessRow,
} from "~/lib/supabase/database.types";
import { deleteEquipmentImage } from "./images";

/**
 * Result type for getEquipment to distinguish errors from empty results
 */
export interface GetEquipmentResult {
  equipment: EquipmentRow[];
  error?: string;
}

/**
 * Get all equipment from Supabase database with processes
 * Returns both equipment and potential error for proper error handling
 */
export async function getEquipment(): Promise<GetEquipmentResult> {
  try {
    const { data, error } = await supabase
      .from("equipment")
      .select(`
        *,
        equipment_processes (
          process_id,
          processes (*)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[EQUIPMENT] Error fetching equipment:", error);
      return { equipment: [], error: error.message };
    }

    // Transform the data to include processes as a flat array
    const equipmentWithProcesses = (data || []).map((item: any) => {
      const processes = (item.equipment_processes || []).map(
        (ep: any) => ep.processes
      );
      const { equipment_processes, ...equipment } = item;
      return {
        ...equipment,
        processes,
      };
    });

    return { equipment: equipmentWithProcesses };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error fetching equipment";
    console.error("[EQUIPMENT] Error fetching equipment:", message);
    return { equipment: [], error: message };
  }
}

/**
 * Get a single equipment item by ID with processes
 */
export async function getEquipmentById(
  id: string
): Promise<(EquipmentRow & { processes: ProcessRow[] }) | null> {
  try {
    const { data, error } = await supabase
      .from("equipment")
      .select(`
        *,
        equipment_processes (
          process_id,
          processes (*)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("[EQUIPMENT] Error fetching equipment:", error);
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch equipment: ${error.message}`);
    }

    // Transform the data to include processes as a flat array
    const processes = ((data as any).equipment_processes || []).map(
      (ep: any) => ep.processes
    );
    const { equipment_processes, ...equipment } = data as any;
    return {
      ...equipment,
      processes,
    };
  } catch (error) {
    console.error("[EQUIPMENT] Error fetching equipment:", error);
    throw error;
  }
}

/**
 * Input type for creating equipment
 */
export interface CreateEquipmentInput {
  name: string;
  description?: string;
  location?: string;
  status?: string;
  documentationUrl?: string;
  imageUrls?: string[];
  processIds?: string[];
  id?: string;
}

/**
 * Create a new equipment item
 */
export async function createEquipment(
  equipmentData: CreateEquipmentInput
): Promise<EquipmentRow> {
  const now = new Date().toISOString();
  const equipmentId =
    equipmentData.id ||
    `equipment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const { data, error } = await supabase
    .from("equipment")
    .insert({
      id: equipmentId,
      name: equipmentData.name,
      description: equipmentData.description ?? null,
      location: equipmentData.location ?? null,
      status: equipmentData.status ?? null,
      documentation_url: equipmentData.documentationUrl ?? null,
      image_urls: equipmentData.imageUrls ?? null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error("[EQUIPMENT] Error creating equipment:", error);
    throw new Error(`Failed to create equipment: ${error.message}`);
  }

  // Associate processes if provided
  if (equipmentData.processIds && equipmentData.processIds.length > 0) {
    await setEquipmentProcesses(equipmentId, equipmentData.processIds);
  }

  return data;
}

/**
 * Update an existing equipment item
 */
export async function updateEquipment(
  equipmentId: string,
  updates: Partial<Omit<EquipmentRow, "id" | "created_at">>
): Promise<EquipmentRow> {
  const { data, error } = await supabase
    .from("equipment")
    .update(updates)
    .eq("id", equipmentId)
    .select()
    .single();

  if (error) {
    console.error("[EQUIPMENT] Error updating equipment:", error);
    if (error.code === "PGRST116") {
      throw new Error("Equipment not found");
    }
    throw new Error(`Failed to update equipment: ${error.message}`);
  }

  if (!data) {
    throw new Error("Equipment not found");
  }

  return data;
}

/**
 * Delete an equipment item
 * Also deletes all associated images from Supabase Storage
 */
export async function deleteEquipment(
  equipmentId: string
): Promise<EquipmentRow> {
  // First, fetch the equipment to get the image URLs before deletion
  const { data: equipmentData, error: fetchError } = await supabase
    .from("equipment")
    .select("*")
    .eq("id", equipmentId)
    .single();

  if (fetchError) {
    console.error(
      "[EQUIPMENT] Error fetching equipment for deletion:",
      fetchError
    );
    if (fetchError.code === "PGRST116") {
      throw new Error("Equipment not found");
    }
    throw new Error(`Failed to fetch equipment: ${fetchError.message}`);
  }

  if (!equipmentData) {
    throw new Error("Equipment not found");
  }

  // Delete all associated images from storage
  if (equipmentData.image_urls) {
    for (const imageUrl of equipmentData.image_urls) {
      await deleteEquipmentImage(imageUrl);
    }
  }

  // Now delete the equipment
  const { error: deleteError } = await supabase
    .from("equipment")
    .delete()
    .eq("id", equipmentId);

  if (deleteError) {
    console.error("[EQUIPMENT] Error deleting equipment:", deleteError);
    throw new Error(`Failed to delete equipment: ${deleteError.message}`);
  }

  return equipmentData;
}

/**
 * Get processes for an equipment item
 */
export async function getEquipmentProcesses(
  equipmentId: string
): Promise<ProcessRow[]> {
  try {
    const { data, error } = await supabase
      .from("equipment_processes")
      .select("process_id, processes (*)")
      .eq("equipment_id", equipmentId);

    if (error) {
      console.error("[EQUIPMENT] Error fetching equipment processes:", error);
      throw new Error(`Failed to fetch equipment processes: ${error.message}`);
    }

    return (data || []).map((item: any) => item.processes);
  } catch (error) {
    console.error("[EQUIPMENT] Error fetching equipment processes:", error);
    throw error;
  }
}

/**
 * Set processes for an equipment item (replaces existing)
 */
export async function setEquipmentProcesses(
  equipmentId: string,
  processIds: string[]
): Promise<void> {
  try {
    // First, delete all existing process associations
    const { error: deleteError } = await supabase
      .from("equipment_processes")
      .delete()
      .eq("equipment_id", equipmentId);

    if (deleteError) {
      console.error(
        "[EQUIPMENT] Error deleting equipment processes:",
        deleteError
      );
      throw new Error(
        `Failed to delete equipment processes: ${deleteError.message}`
      );
    }

    // Then, insert new associations
    if (processIds.length > 0) {
      const equipmentProcesses = processIds.map((processId) => ({
        equipment_id: equipmentId,
        process_id: processId,
      }));

      const { error: insertError } = await supabase
        .from("equipment_processes")
        .insert(equipmentProcesses);

      if (insertError) {
        console.error(
          "[EQUIPMENT] Error inserting equipment processes:",
          insertError
        );
        throw new Error(
          `Failed to insert equipment processes: ${insertError.message}`
        );
      }
    }
  } catch (error) {
    console.error("[EQUIPMENT] Error setting equipment processes:", error);
    throw error;
  }
}
