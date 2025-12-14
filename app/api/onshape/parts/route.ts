import { NextRequest, NextResponse } from "next/server";
import { fetchPartsFromOnshape } from "~/(main)/mfg/parts/utils/partsQuery.server";

/**
 * API endpoint to fetch parts from Onshape with server-side authentication
 * This allows the client to fetch parts without exposing the access token
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;

  // Extract query parameters
  const documentId = url.searchParams.get("documentId");
  const instanceType = url.searchParams.get("instanceType");
  const instanceId = url.searchParams.get("instanceId");
  const elementId = url.searchParams.get("elementId");

  if (!documentId || !instanceType || !instanceId || !elementId) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    // Use shared utility function to fetch parts
    const parts = await fetchPartsFromOnshape({
      documentId,
      instanceType: instanceType as "w" | "v" | "m",
      instanceId,
      elementId,
      elementType: "", // Not used in fetching
    });

    // Return parts data as JSON
    return NextResponse.json(parts);
  } catch (error) {
    console.error("Error fetching parts from Onshape:", error);
    return NextResponse.json(
      { error: "Failed to fetch parts" },
      { status: 500 }
    );
  }
}
