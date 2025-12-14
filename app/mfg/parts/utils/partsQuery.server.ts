import "server-only";
import type { BtPartMetadataInfo } from "~/lib/onshapeApi/generated-wrapper";
import {
  createOnshapeApiClient,
  getPartsWmve,
} from "~/lib/onshapeApi/generated-wrapper";
import type { PartsPageSearchParams } from "../page";

/**
 * Core function to fetch parts from Onshape API
 * This is used by both the API route and server-side prefetching
 * SERVER-ONLY: Uses server-side authentication
 */
export async function fetchPartsFromOnshape(
  queryParams: PartsPageSearchParams
): Promise<BtPartMetadataInfo[]> {
  const client = await createOnshapeApiClient();
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
