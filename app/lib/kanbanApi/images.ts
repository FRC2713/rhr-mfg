import { logger } from "~/lib/logger";
import { supabase } from "~/lib/supabase/client";
import { getValidOnshapeTokenFromRequest } from "~/lib/tokenRefresh";

interface ThumbnailParams {
  documentId: string;
  instanceType: string;
  instanceId: string;
  elementId: string;
  partId: string;
}

/**
 * Build Onshape thumbnail URL from individual parameters
 */
function buildOnshapeThumbnailUrl(params: ThumbnailParams): string {
  const { documentId, instanceType, instanceId, elementId, partId } = params;
  // Use the Onshape API v10 thumbnail endpoint format
  // wvm = workspace/version/microversion type indicator
  const wvm = instanceType === "w" ? "w" : instanceType === "v" ? "v" : "m";
  return `https://cad.onshape.com/api/v10/thumbnails/d/${documentId}/${wvm}/${instanceId}/e/${elementId}/p/${encodeURIComponent(partId)}?outputFormat=PNG&pixelSize=300`;
}

/**
 * Upload Onshape thumbnail to Supabase Storage
 * Returns the public URL of the uploaded image
 */
export async function uploadOnshapeThumbnailToSupabase(
  request: Request,
  params: ThumbnailParams
): Promise<string | null> {
  try {
    // 1. Get Onshape token
    const accessToken = await getValidOnshapeTokenFromRequest(request);
    if (!accessToken) {
      logger.error("[Images] No Onshape access token available");
      return null;
    }

    // 2. Build thumbnail URL
    const thumbnailUrl = buildOnshapeThumbnailUrl(params);

    // 3. Fetch image from Onshape
    const response = await fetch(thumbnailUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      logger.error(
        `[Images] Failed to fetch thumbnail from Onshape: ${response.status}`
      );
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Upload to Supabase Storage
    const fileName = `${params.partId}-${Date.now()}.png`;
    const { error } = await supabase.storage
      .from("card-images")
      .upload(fileName, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (error) {
      logger.error("[Images] Failed to upload to Supabase:", error);
      return null;
    }

    // 5. Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("card-images")
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    logger.error("[Images] Error processing thumbnail:", error);
    return null;
  }
}

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

    // Only process if it's from the card-images bucket
    if (bucket !== "card-images") {
      return null;
    }

    return filePath;
  } catch {
    return null;
  }
}

/**
 * Delete an image from Supabase Storage if it's a Supabase URL
 */
export async function deleteImageFromSupabase(
  imageUrl: string | undefined | null
): Promise<void> {
  if (!imageUrl) {
    return;
  }

  const filePath = extractSupabaseFilePath(imageUrl);
  if (!filePath) {
    // Not a Supabase Storage URL, nothing to delete
    return;
  }

  try {
    const { error } = await supabase.storage
      .from("card-images")
      .remove([filePath]);

    if (error) {
      logger.error("[Images] Failed to delete image from Supabase:", error);
      // Don't throw - card deletion should still succeed even if image deletion fails
    } else {
      logger.debug(`[Images] Successfully deleted image: ${filePath}`);
    }
  } catch (error) {
    logger.error("[Images] Error deleting image from Supabase:", error);
    // Don't throw - card deletion should still succeed even if image deletion fails
  }
}
