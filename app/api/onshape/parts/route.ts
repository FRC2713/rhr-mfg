import { NextRequest, NextResponse } from "next/server";
import {
  createOnshapeApiClient,
  getPartsWmve,
} from "~/lib/onshapeApi/generated-wrapper";

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
  const withThumbnails = url.searchParams.get("withThumbnails") === "true";

  if (!documentId || !instanceType || !instanceId || !elementId) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    // Create authenticated client
    const client = await createOnshapeApiClient();

    // Fetch parts data
    const response = await getPartsWmve({
      client,
      path: {
        did: documentId,
        wvm: instanceType as "w" | "v" | "m",
        wvmid: instanceId,
        eid: elementId,
      },
      query: {
        withThumbnails,
        includePropertyDefaults: true,
      },
    });

    // Return parts data as JSON
    return NextResponse.json(response.data || []);
  } catch (error) {
    console.error("Error fetching parts from Onshape:", error);
    return NextResponse.json(
      { error: "Failed to fetch parts" },
      { status: 500 }
    );
  }
}
