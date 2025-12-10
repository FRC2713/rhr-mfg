import type { Route } from "./+types/api.onshape.thumbnail";
import { refreshOnshapeTokenIfNeededWithSession } from "~/lib/tokenRefresh";
import { getSession, commitSession } from "~/lib/session";

/**
 * Build Onshape thumbnail URL from individual parameters
 */
function buildOnshapeThumbnailUrl(params: {
  documentId: string;
  instanceType: string;
  instanceId: string;
  elementId: string;
  partId: string;
}): string {
  const { documentId, instanceType, instanceId, elementId, partId } = params;
  // Use the Onshape API v10 thumbnail endpoint format
  // wvm = workspace/version/microversion type indicator
  const wvm = instanceType === "w" ? "w" : instanceType === "v" ? "v" : "m";
  return `https://cad.onshape.com/api/v10/thumbnails/d/${documentId}/${wvm}/${instanceId}/e/${elementId}/p/${encodeURIComponent(partId)}?outputFormat=PNG&pixelSize=300`;
}

/**
 * Proxy endpoint for Onshape thumbnails
 * This allows us to fetch thumbnails with authentication
 * 
 * Supports two modes:
 * 1. Pass a full Onshape thumbnail URL via `url` param
 * 2. Pass individual params: documentId, instanceType, instanceId, elementId, partId
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  
  // Try to get the full URL first
  let thumbnailUrl = url.searchParams.get("url");
  
  // If no URL provided, try to build from individual parameters
  if (!thumbnailUrl) {
    const documentId = url.searchParams.get("documentId");
    const instanceType = url.searchParams.get("instanceType") || "w";
    const instanceId = url.searchParams.get("instanceId");
    const elementId = url.searchParams.get("elementId");
    const partId = url.searchParams.get("partId");
    
    if (documentId && instanceId && elementId && partId) {
      thumbnailUrl = buildOnshapeThumbnailUrl({
        documentId,
        instanceType,
        instanceId,
        elementId,
        partId,
      });
    }
  }

  if (!thumbnailUrl) {
    return new Response("Missing thumbnail URL or required parameters (documentId, instanceId, elementId, partId)", { status: 400 });
  }

  try {
    // Get session first so we can commit it if token is refreshed
    const session = await getSession(request);
    
    // Get valid Onshape token (may refresh and update session)
    const accessToken = await refreshOnshapeTokenIfNeededWithSession(session);
    if (!accessToken) {
      console.error("[THUMBNAIL] No access token found. Request headers:", {
        cookie: request.headers.get("Cookie") ? "present" : "missing",
        userAgent: request.headers.get("User-Agent"),
        referer: request.headers.get("Referer"),
      });
      return new Response("Not authenticated", { status: 401 });
    }

    // Fetch the thumbnail with authentication
    const response = await fetch(thumbnailUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("[THUMBNAIL] Onshape API error:", {
        status: response.status,
        statusText: response.statusText,
        url: thumbnailUrl,
      });
      return new Response(`Failed to fetch thumbnail: ${response.statusText}`, { status: response.status });
    }

    // Get the image data
    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get("Content-Type") || "image/png";

    // Commit session if it was updated (e.g., during token refresh)
    const sessionCookie = await commitSession(session);

    // Return the image with appropriate headers
    return new Response(imageData, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Set-Cookie": sessionCookie, // Update session cookie if token was refreshed
      },
    });
  } catch (error) {
    console.error("Error fetching thumbnail:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

