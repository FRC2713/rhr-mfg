import { redirect } from "next/navigation";
import { exchangeCodeForToken } from "~/lib/onshapeApi/auth";
import { commitSession, destroySession, getSession } from "~/lib/session";

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

  const session = await getSession();
  const storedState = session.get("onshapeOauthState") as string | undefined;

  // Verify state to prevent CSRF attacks
  if (!state || state !== storedState) {
    console.error("State validation failed:", {
      receivedState: state,
      storedState: storedState,
      hasSession: !!session,
      sessionKeys: Object.keys(session.toJSON()),
    });

    // If state doesn't match but we have a code, it might be a session issue
    // Don't redirect to error immediately - try to clear and restart auth
    if (code && !storedState) {
      // Session was lost - clear everything and redirect to auth start
      await destroySession(session);
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

    // Store tokens in session
    session.set("onshapeAccessToken", tokenResponse.access_token);
    session.set("onshapeRefreshToken", tokenResponse.refresh_token);
    session.set(
      "onshapeExpiresAt",
      Date.now() + tokenResponse.expires_in * 1000
    );
    session.unset("onshapeOauthState"); // Remove state after successful exchange
    session.unset("onshapeAuthRedirectCount"); // Clear redirect counter on success

    // Always redirect back to signin page to check if other service needs auth
    // Keep signInRedirect in session - signin page will use it once both services are authenticated
    const redirectTo = "/signin";

    // Commit session and redirect
    const cookie = await commitSession(session);
    const response = redirect(redirectTo);
    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (error) {
    console.error("Token exchange error:", error);
    await destroySession(session);
    return redirect(
      "/?error=" + encodeURIComponent("Failed to exchange authorization code")
    );
  }
}
