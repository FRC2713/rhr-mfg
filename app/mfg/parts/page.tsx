import { MfgPartsClient } from "./parts-client";
import type { Metadata } from "next";

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
  instanceType: string;
  instanceId: string;
  elementId: string;
  elementType: string;
};

export default async function MfgParts({
  searchParams,
}: {
  searchParams: PartsPageSearchParams;
}) {
  return (
    <MfgPartsClient queryParams={searchParams} error={null} exampleUrl={null} />
  );
}
