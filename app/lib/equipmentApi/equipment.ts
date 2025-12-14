import { supabase } from "~/lib/supabase/client";
import type { EquipmentRow } from "~/lib/supabase/database.types";
import { deleteEquipmentImage } from "./images";

/**
 * Result type for getEquipment to distinguish errors from empty results
 */
export interface GetEquipmentResult {
  equipment: EquipmentRow[];
  error?: string;
}

/**
 * Get all equipment from Supabase database
 * Returns both equipment and potential error for proper error handling
 */
export async function getEquipment(): Promise<GetEquipmentResult> {
  try {
    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[EQUIPMENT] Error fetching equipment:", error);
      return { equipment: [], error: error.message };
    }

    return { equipment: data || [] };
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
 * Get a single equipment item by ID
 */
export async function getEquipmentById(
  id: string
): Promise<EquipmentRow | null> {
  try {
    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[EQUIPMENT] Error fetching equipment:", error);
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch equipment: ${error.message}`);
    }

    return data;
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
  category?: string;
  location?: string;
  status?: string;
  documentationUrl?: string;
  imageUrls?: string[];
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
      category: equipmentData.category ?? null,
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
