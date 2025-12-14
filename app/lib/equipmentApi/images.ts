import { logger } from "~/lib/logger";
import { supabase } from "~/lib/supabase/client";

/**
 * Extract file path from Supabase Storage public URL
 * Returns null if the URL is not a Supabase Storage URL
 */
function extractSupabaseFilePath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Supabase Storage public URLs have the format:
    // https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>/<file-path>
    const pathParts = urlObj.pathname.split("/");
    const publicIndex = pathParts.indexOf("public");

    if (publicIndex === -1 || publicIndex === pathParts.length - 1) {
      return null;
    }

    // Extract bucket and file path
    const bucket = pathParts[publicIndex + 1];
    const filePath = pathParts.slice(publicIndex + 2).join("/");

    // Only process if it's from the equipment-images bucket
    if (bucket !== "equipment-images") {
      return null;
    }

    return filePath;
  } catch {
    return null;
  }
}

/**
 * Upload an equipment image to Supabase Storage
 * @param file - The file to upload (File or Buffer)
 * @param equipmentId - The equipment ID to associate with the image
 * @returns The public URL of the uploaded image, or null if upload fails
 */
export async function uploadEquipmentImage(
  file: File | Buffer,
  equipmentId: string
): Promise<string | null> {
  try {
    let buffer: Buffer;
    let contentType: string;
    let fileName: string;

    if (file instanceof File) {
      // Client-side File object
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      contentType = file.type || "image/jpeg";
      fileName = `${equipmentId}-${Date.now()}-${file.name}`;
    } else {
      // Server-side Buffer
      buffer = file;
      contentType = "image/jpeg"; // Default, should be passed if known
      fileName = `${equipmentId}-${Date.now()}.jpg`;
    }

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from("equipment-images")
      .upload(fileName, buffer, {
        contentType,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      logger.error("[EQUIPMENT IMAGES] Failed to upload to Supabase:", error);
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("equipment-images")
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    logger.error("[EQUIPMENT IMAGES] Error uploading image:", error);
    return null;
  }
}

/**
 * Delete an equipment image from Supabase Storage
 * @param imageUrl - The URL of the image to delete
 */
export async function deleteEquipmentImage(
  imageUrl: string | undefined | null
): Promise<void> {
  if (!imageUrl) {
    return;
  }

  const filePath = extractSupabaseFilePath(imageUrl);
  if (!filePath) {
    // Not a Supabase Storage URL, nothing to delete
    logger.debug(
      "[EQUIPMENT IMAGES] Image URL is not a Supabase Storage URL, skipping deletion"
    );
    return;
  }

  try {
    const { error } = await supabase.storage
      .from("equipment-images")
      .remove([filePath]);

    if (error) {
      logger.error(
        "[EQUIPMENT IMAGES] Failed to delete image from Supabase:",
        error
      );
      // Don't throw - equipment deletion should still succeed even if image deletion fails
    } else {
      logger.debug(`[EQUIPMENT IMAGES] Successfully deleted image: ${filePath}`);
    }
  } catch (error) {
    logger.error("[EQUIPMENT IMAGES] Error deleting image from Supabase:", error);
    // Don't throw - equipment deletion should still succeed even if image deletion fails
  }
}

