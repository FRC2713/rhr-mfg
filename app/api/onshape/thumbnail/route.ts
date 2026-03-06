import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase/client";
import { refreshOnshapeTokenIfNeeded } from "~/lib/tokenRefresh";

const CARD_IMAGES_BUCKET = "card-images";

/**
 * Get public URL for a path in the card-images bucket
 */
function getSupabasePublicThumbnailUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from(CARD_IMAGES_BUCKET)
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Returns true if the URL is a Supabase storage public URL (already cached)
 */
function isSupabaseStorageUrl(url: string): boolean {
  try {
    const u = new URL(url, "https://placeholder");
    return u.pathname.includes("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

/**
 * If image_url was stored as our proxy URL (/api/onshape/thumbnail?url=...), extract the real
 * Onshape URL so we can fetch and cache by it. Otherwise return as-is.
 */
function resolveImageUrl(imageUrl: string): string {
  const trimmed = imageUrl.trim();
  if (!trimmed.includes("/api/onshape/thumbnail") || !trimmed.includes("url=")) {
    return trimmed;
  }
  try {
    const idx = trimmed.indexOf("?");
    if (idx === -1) return trimmed;
    const params = new URLSearchParams(trimmed.slice(idx));
    const real = params.get("url");
    if (real) return real;
  } catch {
    // ignore
  }
  return trimmed;
}

/**
 * Thumbnail endpoint for kanban cards only.
 * GET ?cardId=<id> — looks up card's image_url, checks part_thumbnails by source_url,
 * on miss fetches from Onshape (no cache on 404), uploads and redirects.
 */
export async function GET(request: NextRequest) {
  const cardId = request.nextUrl.searchParams.get("cardId");
  if (!cardId) {
    return NextResponse.json(
      { error: "Missing cardId" },
      { status: 400 }
    );
  }

  const { data: card, error: cardError } = await supabase
    .from("kanban_cards")
    .select("image_url")
    .eq("id", cardId)
    .maybeSingle();

  if (cardError || !card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const rawImageUrl = card.image_url?.trim() || null;
  if (!rawImageUrl) {
    return NextResponse.json(
      { error: "Card has no image_url" },
      { status: 404 }
    );
  }

  // Normalize: if stored value is our proxy URL, use the real Onshape URL for fetch/cache
  const imageUrl = resolveImageUrl(rawImageUrl);

  // Already a Supabase URL — redirect directly
  if (isSupabaseStorageUrl(imageUrl)) {
    return NextResponse.redirect(imageUrl, 307);
  }

  // Look up cache by source_url (resolved image URL)
  const { data: cached } = await supabase
    .from("part_thumbnails")
    .select("storage_path")
    .eq("source_url", imageUrl)
    .maybeSingle();

  if (cached?.storage_path) {
    const publicUrl = getSupabasePublicThumbnailUrl(cached.storage_path);
    return NextResponse.redirect(publicUrl, 307);
  }

  // Cache miss — fetch from Onshape (requires absolute URL)
  if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
    return NextResponse.json(
      { error: "Card image_url is not a fetchable URL (use absolute Onshape or Supabase URL)" },
      { status: 400 }
    );
  }

  const accessToken = await refreshOnshapeTokenIfNeeded();
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const response = await fetch(imageUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `Failed to fetch thumbnail: ${response.statusText}` },
      { status: response.status }
    );
  }

  const imageData = await response.arrayBuffer();
  const buffer = Buffer.from(imageData);
  const contentType = response.headers.get("Content-Type") || "image/png";

  // Derive path from source_url so the same image is not duplicated per card
  const keyHash = createHash("sha256").update(imageUrl).digest("hex").slice(0, 32);
  const storagePath = `thumbnails/${keyHash}.png`;

  const { error: uploadError } = await supabase.storage
    .from(CARD_IMAGES_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    console.error("[THUMBNAIL] Storage upload failed:", uploadError);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Synthetic PK for part_thumbnails (table requires the 5 columns)
  const { error: insertError } = await supabase.from("part_thumbnails").upsert(
    [
      {
        document_id: `cache_${keyHash}`,
        instance_type: "c",
        instance_id: "0",
        element_id: "0",
        part_id: "0",
        storage_path: storagePath,
        source_url: imageUrl,
      },
    ],
    {
      onConflict: "document_id,instance_type,instance_id,element_id,part_id",
    }
  );

  if (insertError) {
    console.error("[THUMBNAIL] part_thumbnails upsert failed:", insertError);
  }

  const publicUrl = getSupabasePublicThumbnailUrl(storagePath);
  return NextResponse.redirect(publicUrl, 307);
}
