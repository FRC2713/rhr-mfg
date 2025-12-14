import "server-only";
import type { BtPartMetadataInfo } from "~/lib/onshapeApi/generated-wrapper";
import {
  createOnshapeApiClient,
  createOnshapeApiClientReadOnly,
  getPartsWmve,
} from "~/lib/onshapeApi/generated-wrapper";
import type { PartsPageSearchParams } from "../page";

/**
 * Core function to fetch parts from Onshape API
 * This is used by both the API route and server-side prefetching
 * SERVER-ONLY: Uses server-side authentication
 *
 * @param queryParams - Query parameters for fetching parts
 * @param allowTokenRefresh - If true, will attempt to refresh tokens (for Route Handlers).
 *                           If false, uses read-only token access (for server components).
 */
export async function fetchPartsFromOnshape(
  queryParams: PartsPageSearchParams,
  allowTokenRefresh: boolean = true
): Promise<BtPartMetadataInfo[]> {
  // Use read-only client for server components, full client for route handlers
  const client = allowTokenRefresh
    ? await createOnshapeApiClient()
    : await createOnshapeApiClientReadOnly();

  const response = await getPartsWmve({
    client,
    path: {
      did: queryParams.documentId,
      wvm: queryParams.instanceType,
      wvmid: queryParams.instanceId,
      eid: queryParams.elementId,
    },
    query: {
      withThumbnails: true,
      includePropertyDefaults: true,
    },
  });
  return response.data || [];
}
