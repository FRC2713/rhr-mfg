import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { exchangeCodeForToken } from "~/lib/onshapeApi/auth";
import {
  clearOAuthState,
  clearOnshapeTokens,
  getOAuthState,
  setOnshapeTokens,
} from "~/lib/onshapeAuth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    return redirect("/?error=" + encodeURIComponent(error));
  }

  if (!code) {
    return redirect(
      "/?error=" + encodeURIComponent("No authorization code received")
    );
  }

  const storedState = await getOAuthState();

  // Verify state to prevent CSRF attacks
  if (!state || state !== storedState) {
    console.error("State validation failed:", {
      receivedState: state,
      storedState: storedState,
    });

    // If state doesn't match but we have a code, it might be a cookie issue
    // Don't redirect to error immediately - try to clear and restart auth
    if (code && !storedState) {
      // Cookie was lost - clear everything and redirect to auth start
      await clearOnshapeTokens();
      await clearOAuthState();
      return redirect("/auth/onshape");
    }

    return redirect(
      "/?error=" +
        encodeURIComponent("Invalid state parameter. Please try again.")
    );
  }

  const clientId = process.env.ONSHAPE_CLIENT_ID;
  const clientSecret = process.env.ONSHAPE_CLIENT_SECRET;
  const redirectUri = process.env.ONSHAPE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Onshape OAuth environment variables");
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(
      code,
      redirectUri,
      clientId,
      clientSecret
    );

    // Store tokens in cookies
    const expiresAt = Date.now() + tokenResponse.expires_in * 1000;
    await setOnshapeTokens(
      tokenResponse.access_token,
      tokenResponse.refresh_token,
      expiresAt
    );

    // Clear OAuth state after successful exchange
    await clearOAuthState();

    // Always redirect back to signin page to check if other service needs auth
    const redirectTo = "/signin";

    return NextResponse.redirect(new URL(redirectTo, url.origin));
  } catch (error) {
    console.error("Token exchange error:", error);
    await clearOnshapeTokens();
    await clearOAuthState();
    return redirect(
      "/?error=" + encodeURIComponent("Failed to exchange authorization code")
    );
  }
}
