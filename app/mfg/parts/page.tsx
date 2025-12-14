import { MfgPartsClient } from "./parts-client";
import type { Metadata } from "next";
import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import {
  createOnshapeApiClient,
  getPartsWmve,
} from "~/lib/onshapeApi/generated-wrapper";
import type { BtPartMetadataInfo } from "~/lib/onshapeApi/generated-wrapper";

export const metadata: Metadata = {
  title: "MFG Parts - Onshape Integration",
  description: "View parts from Onshape Part Studio",
};

/**
 * Query parameters for the parts page
 * @example /mfg/parts?elementType=PARTSTUDIO&documentId={$documentId}&instanceType={$workspaceOrVersion}&instanceId={$workspaceOrVersionId}&elementId={$elementId}
 */
export type PartsPageSearchParams = {
  documentId: string;
  instanceType: "w" | "v" | "m";
  instanceId: string;
  elementId: string;
  elementType: string;
};

export default async function MfgParts({
  searchParams,
}: {
  searchParams: Promise<PartsPageSearchParams>;
}) {
  const queryParams = await searchParams;
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // Cache for 30 seconds
      },
    },
  });

  // Prefetch parts data if we have the required parameters
  if (queryParams.documentId) {
    await queryClient.prefetchQuery({
      queryKey: [
        "onshape-parts",
        queryParams.documentId,
        queryParams.instanceType,
        queryParams.instanceId,
        queryParams.elementId,
      ],
      queryFn: async (): Promise<BtPartMetadataInfo[]> => {
        try {
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
        } catch (error) {
          console.error("Error prefetching parts:", error);
          // Return empty array on error - client will handle retry
          return [];
        }
      },
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MfgPartsClient
        queryParams={queryParams}
        error={null}
        exampleUrl={null}
      />
    </HydrationBoundary>
  );
}
