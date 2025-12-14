import { redirect } from "next/navigation";
import {
  isOnshapeAuthenticated,
  getSession,
  commitSession,
} from "~/lib/session";
import { validateQueryParams } from "./loaders/queryValidation";
import { MfgPartsClient } from "./parts-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MFG Parts - Onshape Integration",
  description: "View parts from Onshape Part Studio",
};

export default async function MfgParts({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Check Onshape authentication (required)
  const onshapeAuthenticated = await isOnshapeAuthenticated();

  if (!onshapeAuthenticated) {
    // Preserve the full URL including query parameters for redirect
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        params.append(key, Array.isArray(value) ? value[0] : value);
      }
    });
    const fullPath = `/mfg/parts${params.toString() ? `?${params.toString()}` : ""}`;
    console.log("[MFG.PARTS] Not authenticated, redirecting to signin");
    console.log("[MFG.PARTS] Full path:", fullPath);
    return redirect(`/signin?redirect=${encodeURIComponent(fullPath)}`);
  }

  // Build a Request-like object for validation
  const url = new URL(`http://localhost/mfg/parts`);
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) {
      url.searchParams.append(key, Array.isArray(value) ? value[0] : value);
    }
  });
  const request = new Request(url.toString());

  // Validate query parameters
  const validation = validateQueryParams(request);
  if (!validation.isValid) {
    return (
      <MfgPartsClient
        queryParams={
          validation.queryParams || {
            documentId: null,
            instanceType: "w",
            instanceId: null,
            elementId: null,
            elementType: null,
          }
        }
        error={validation.error}
        exampleUrl={validation.exampleUrl}
      />
    );
  }

  await commitSession(await getSession());

  return (
    <MfgPartsClient
      queryParams={validation.queryParams!}
      error={null}
      exampleUrl={null}
    />
  );
}
