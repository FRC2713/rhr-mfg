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
  return (
    <MfgPartsClient queryParams={queryParams} error={null} exampleUrl={null} />
  );
}
