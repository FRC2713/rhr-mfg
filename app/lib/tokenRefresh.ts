/**
 * Token Refresh Middleware
 * Provides utilities for automatically refreshing tokens before expiration
 */

import { refreshAccessToken as refreshOnshapeToken } from "./onshapeApi/auth";
import {
  commitSession,
  getSession,
  getSessionFromRequest,
  type Session,
} from "./session";

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiration

/**
 * Check if a token needs to be refreshed (within 5 minutes of expiration)
 */
export function needsRefresh(expiresAt: number | null): boolean {
  if (!expiresAt) return true;
  const now = Date.now();
  const expirationTime = expiresAt - REFRESH_BUFFER_MS;
  return now >= expirationTime;
}

/**
 * Refresh Onshape token if needed (accepts session object)
 */
export async function refreshOnshapeTokenIfNeededWithSession(
  session: Session
): Promise<string | null> {
  const accessToken = session.get("onshapeAccessToken") as string | undefined;
  const refreshToken = session.get("onshapeRefreshToken") as string | undefined;
  const expiresAt = session.get("onshapeExpiresAt") as number | undefined;

  if (!accessToken || !refreshToken) {
    return null;
  }

  // Check if token needs refresh
  if (!needsRefresh(expiresAt || null)) {
    return accessToken;
  }

  // Refresh token
  const clientId = process.env.ONSHAPE_CLIENT_ID;
  const clientSecret = process.env.ONSHAPE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Onshape OAuth credentials");
  }

  try {
    const tokenResponse = await refreshOnshapeToken(
      refreshToken,
      clientId,
      clientSecret
    );

    // Update session
    session.set("onshapeAccessToken", tokenResponse.access_token);
    session.set("onshapeRefreshToken", tokenResponse.refresh_token);
    session.set(
      "onshapeExpiresAt",
      Date.now() + tokenResponse.expires_in * 1000
    );

    // Commit session if it's dirty
    if (session.isDirtyFlag) {
      await commitSession(session);
    }

    return tokenResponse.access_token;
  } catch (error) {
    console.error("Failed to refresh Onshape token:", error);
    // Clear invalid tokens
    session.unset("onshapeAccessToken");
    session.unset("onshapeRefreshToken");
    session.unset("onshapeExpiresAt");
    if (session.isDirtyFlag) {
      await commitSession(session);
    }
    return null; // Return null instead of throwing
  }
}

/**
 * Refresh Onshape token if needed (for server components and route handlers)
 */
export async function refreshOnshapeTokenIfNeeded(): Promise<string | null> {
  try {
    const session = await getSession();
    return await refreshOnshapeTokenIfNeededWithSession(session);
  } catch (error) {
    console.error("[TOKEN REFRESH] Error refreshing token:", error);
    return null;
  }
}

/**
 * Refresh Onshape token if needed (accepts request - for compatibility)
 */
export async function refreshOnshapeTokenIfNeededFromRequest(
  request: Request
): Promise<string | null> {
  try {
    const session = await getSessionFromRequest(request);
    return await refreshOnshapeTokenIfNeededWithSession(session);
  } catch (error) {
    console.error("[TOKEN REFRESH] Error refreshing token:", error);
    return null;
  }
}

/**
 * Get valid Onshape token, refreshing if necessary (for server components and route handlers)
 */
export async function getValidOnshapeToken(): Promise<string | null> {
  return refreshOnshapeTokenIfNeeded();
}

/**
 * Get valid Onshape token from session (for use with session object)
 */
export async function getValidOnshapeTokenFromSession(
  session: Session
): Promise<string | null> {
  return refreshOnshapeTokenIfNeededWithSession(session);
}

/**
 * Get valid Onshape token, refreshing if necessary (for request-based usage - compatibility)
 */
export async function getValidOnshapeTokenFromRequest(
  request: Request
): Promise<string | null> {
  return refreshOnshapeTokenIfNeededFromRequest(request);
}
