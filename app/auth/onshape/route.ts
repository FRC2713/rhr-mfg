import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getAuthorizationUrl } from "~/lib/onshapeApi/auth";
import { getOnshapeToken, setOAuthState } from "~/lib/onshapeAuth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirect") || "/";

  // Check if already authenticated
  const accessToken = await getOnshapeToken();
  if (accessToken) {
    return NextResponse.redirect(new URL(redirectTo, url.origin));
  }

  const clientId = process.env.ONSHAPE_CLIENT_ID;
  const redirectUri = process.env.ONSHAPE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error(
      "Missing ONSHAPE_CLIENT_ID or ONSHAPE_REDIRECT_URI environment variables"
    );
  }

  // Generate state for CSRF protection
  const state = randomBytes(32).toString("hex");
  await setOAuthState(state);

  // Generate authorization URL
  const authUrl = getAuthorizationUrl(redirectUri, clientId, state);

  // Redirect to authorization URL
  return NextResponse.redirect(authUrl);
}
