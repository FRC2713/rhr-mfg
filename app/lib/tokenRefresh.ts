/**
 * Token Refresh Middleware
 * Provides utilities for automatically refreshing tokens before expiration
 */

import { getSession } from "./session";
import { refreshAccessToken as refreshOnshapeToken } from "./onshapeApi/auth";

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
export async function refreshOnshapeTokenIfNeededWithSession(session: any): Promise<string | null> {
  const accessToken = session.get("onshapeAccessToken");
  const refreshToken = session.get("onshapeRefreshToken");
  const expiresAt = session.get("onshapeExpiresAt");

  if (!accessToken || !refreshToken) {
    return null;
  }

  // Check if token needs refresh
  if (!needsRefresh(expiresAt)) {
    return accessToken;
  }

  // Refresh token
  const clientId = process.env.ONSHAPE_CLIENT_ID;
  const clientSecret = process.env.ONSHAPE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Onshape OAuth credentials");
  }

  try {
    const tokenResponse = await refreshOnshapeToken(refreshToken, clientId, clientSecret);
    
    // Update session
    session.set("onshapeAccessToken", tokenResponse.access_token);
    session.set("onshapeRefreshToken", tokenResponse.refresh_token);
    session.set("onshapeExpiresAt", Date.now() + tokenResponse.expires_in * 1000);
    
    return tokenResponse.access_token;
  } catch (error) {
    console.error("Failed to refresh Onshape token:", error);
    // Clear invalid tokens
    session.unset("onshapeAccessToken");
    session.unset("onshapeRefreshToken");
    session.unset("onshapeExpiresAt");
    return null; // Return null instead of throwing
  }
}

/**
 * Refresh Onshape token if needed (accepts request)
 */
export async function refreshOnshapeTokenIfNeeded(request: Request): Promise<string | null> {
  try {
    const session = await getSession(request);
    return await refreshOnshapeTokenIfNeededWithSession(session);
  } catch (error) {
    console.error("[TOKEN REFRESH] Error refreshing token:", error);
    return null;
  }
}

/**
 * Get valid Onshape token, refreshing if necessary
 */
export async function getValidOnshapeToken(request: Request): Promise<string | null> {
  return refreshOnshapeTokenIfNeeded(request);
}

