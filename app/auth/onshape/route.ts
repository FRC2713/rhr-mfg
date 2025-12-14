import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { getAuthorizationUrl } from "~/lib/onshapeApi/auth";
import { commitSession, getSession } from "~/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirect") || "/";

  // Check if already authenticated
  if (session.get("onshapeAccessToken")) {
    const cookie = await commitSession(session);
    const response = redirect(redirectTo);
    response.headers.set("Set-Cookie", cookie);
    return response;
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
  session.set("onshapeOauthState", state);

  // Generate authorization URL
  const authUrl = getAuthorizationUrl(redirectUri, clientId, state);

  // Commit session and redirect
  const cookie = await commitSession(session);
  const response = redirect(authUrl);
  response.headers.set("Set-Cookie", cookie);
  return response;
}
