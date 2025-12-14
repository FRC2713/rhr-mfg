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

  console.log("[AUTH CALLBACK] ===== Onshape OAuth Callback =====");
  console.log("[AUTH CALLBACK] Request URL:", request.url);
  console.log("[AUTH CALLBACK] URL origin:", url.origin);
  console.log("[AUTH CALLBACK] URL host:", url.host);
  console.log("[AUTH CALLBACK] URL hostname:", url.hostname);
  console.log("[AUTH CALLBACK] URL protocol:", url.protocol);
  console.log("[AUTH CALLBACK] NODE_ENV:", process.env.NODE_ENV);
  console.log(
    "[AUTH CALLBACK] ONSHAPE_REDIRECT_URI env:",
    process.env.ONSHAPE_REDIRECT_URI || "(not set)"
  );
  console.log(
    "[AUTH CALLBACK] Request headers.host:",
    request.headers.get("host")
  );
  console.log(
    "[AUTH CALLBACK] Request headers.x-forwarded-host:",
    request.headers.get("x-forwarded-host")
  );
  console.log(
    "[AUTH CALLBACK] Request headers.x-forwarded-proto:",
    request.headers.get("x-forwarded-proto")
  );
  console.log(
    "[AUTH CALLBACK] Query params - code:",
    code ? `${code.substring(0, 16)}...` : "(missing)"
  );
  console.log(
    "[AUTH CALLBACK] Query params - state:",
    state ? `${state.substring(0, 16)}...` : "(missing)"
  );
  console.log("[AUTH CALLBACK] Query params - error:", error || "(none)");

  // Handle OAuth errors
  if (error) {
    console.error("[AUTH CALLBACK] OAuth error received:", error);
    return redirect("/?error=" + encodeURIComponent(error));
  }

  if (!code) {
    console.error("[AUTH CALLBACK] No authorization code received");
    return redirect(
      "/?error=" + encodeURIComponent("No authorization code received")
    );
  }

  const storedState = await getOAuthState();
  console.log(
    "[AUTH CALLBACK] Stored OAuth state:",
    storedState ? `${storedState.substring(0, 16)}...` : "(missing)"
  );

  // Verify state to prevent CSRF attacks
  if (!state || state !== storedState) {
    console.error("[AUTH CALLBACK] State validation failed:", {
      receivedState: state ? `${state.substring(0, 16)}...` : "(missing)",
      storedState: storedState
        ? `${storedState.substring(0, 16)}...`
        : "(missing)",
      statesMatch: state === storedState,
    });

    // If state doesn't match but we have a code, it might be a cookie issue
    // Don't redirect to error immediately - try to clear and restart auth
    if (code && !storedState) {
      console.log(
        "[AUTH CALLBACK] Cookie was lost - clearing tokens and restarting auth"
      );
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

  console.log("[AUTH CALLBACK] State validation passed");

  const clientId = process.env.ONSHAPE_CLIENT_ID;
  const clientSecret = process.env.ONSHAPE_CLIENT_SECRET;
  console.log(
    "[AUTH CALLBACK] ONSHAPE_CLIENT_ID:",
    clientId ? `${clientId.substring(0, 8)}...` : "(not set)"
  );
  console.log(
    "[AUTH CALLBACK] ONSHAPE_CLIENT_SECRET:",
    clientSecret ? "***set***" : "(not set)"
  );

  // Dynamically construct redirect URI from request URL
  // Falls back to environment variable if set (for backwards compatibility)
  const redirectUri =
    process.env.ONSHAPE_REDIRECT_URI || `${url.origin}/auth/onshape/callback`;

  console.log("[AUTH CALLBACK] Constructed redirectUri:", redirectUri);
  console.log(
    "[AUTH CALLBACK] Using env ONSHAPE_REDIRECT_URI:",
    !!process.env.ONSHAPE_REDIRECT_URI
  );

  if (!clientId || !clientSecret) {
    throw new Error("Missing Onshape OAuth environment variables");
  }

  try {
    console.log("[AUTH CALLBACK] Exchanging authorization code for token...");
    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(
      code,
      redirectUri,
      clientId,
      clientSecret
    );

    console.log("[AUTH CALLBACK] Token exchange successful");
    console.log("[AUTH CALLBACK] Token expires_in:", tokenResponse.expires_in);

    // Store tokens in cookies
    const expiresAt = Date.now() + tokenResponse.expires_in * 1000;
    await setOnshapeTokens(
      tokenResponse.access_token,
      tokenResponse.refresh_token,
      expiresAt
    );

    console.log("[AUTH CALLBACK] Tokens stored in cookies");
    console.log(
      "[AUTH CALLBACK] Token expires at:",
      new Date(expiresAt).toISOString()
    );

    // Clear OAuth state after successful exchange
    await clearOAuthState();
    console.log("[AUTH CALLBACK] OAuth state cleared");

    // Always redirect back to signin page to check if other service needs auth
    const redirectTo = "/signin";
    const redirectUrl = new URL(redirectTo, url.origin);
    console.log("[AUTH CALLBACK] Redirecting to:", redirectUrl.toString());
    console.log("[AUTH CALLBACK] ===== Callback Complete =====");

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[AUTH CALLBACK] Token exchange error:", error);
    await clearOnshapeTokens();
    await clearOAuthState();
    return redirect(
      "/?error=" + encodeURIComponent("Failed to exchange authorization code")
    );
  }
}
