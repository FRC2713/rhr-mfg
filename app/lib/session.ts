import { cookies } from "next/headers";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";
import { getValidOnshapeTokenFromSession } from "./tokenRefresh";

const SESSION_COOKIE_NAME = "__basecamp_session";
const SESSION_SECRET =
  process.env.SESSION_SECRET || "basecamp-session-secret-change-in-production";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Simple session data structure
interface SessionData {
  [key: string]: unknown;
}

// Create a session-like object that mimics React Router's session API
class Session {
  private data: SessionData;
  private isDirty: boolean = false;

  constructor(data: SessionData = {}) {
    this.data = { ...data };
  }

  get(key: string) {
    return this.data[key];
  }

  set(key: string, value: unknown) {
    this.data[key] = value;
    this.isDirty = true;
  }

  unset(key: string) {
    delete this.data[key];
    this.isDirty = true;
  }

  has(key: string) {
    return key in this.data;
  }

  get isDirtyFlag() {
    return this.isDirty;
  }

  toJSON() {
    return this.data;
  }
}

// Encrypt session data
function encryptSession(data: SessionData): string {
  const algorithm = "aes-256-cbc";
  const key = createHmac("sha256", SESSION_SECRET).digest().slice(0, 32);
  const iv = randomBytes(16);
  const cipher = createCipheriv(algorithm, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

// Decrypt session data
function decryptSession(encrypted: string): SessionData | null {
  try {
    const algorithm = "aes-256-cbc";
    const key = createHmac("sha256", SESSION_SECRET).digest().slice(0, 32);
    const [ivHex, encryptedHex] = encrypted.split(":");

    if (!ivHex || !encryptedHex) {
      return null;
    }

    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = createDecipheriv(algorithm, key, iv);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return null;
  }
}

// Get session from cookies (for server components and route handlers)
export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!cookie?.value) {
    return new Session();
  }

  const data = decryptSession(cookie.value);
  return new Session(data || {});
}

// Get session from request (for compatibility with existing code)
export async function getSessionFromRequest(
  request: Request
): Promise<Session> {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return new Session();
  }

  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => {
      const [key, ...values] = c.split("=");
      return [key, values.join("=")];
    })
  );

  const cookieValue = cookies[SESSION_COOKIE_NAME];
  if (!cookieValue) {
    return new Session();
  }

  const data = decryptSession(decodeURIComponent(cookieValue));
  return new Session(data || {});
}

// Commit session to cookies
export async function commitSession(session: Session): Promise<string> {
  const cookieStore = await cookies();
  const encrypted = encryptSession(session.toJSON());

  cookieStore.set(SESSION_COOKIE_NAME, encrypted, {
    httpOnly: true,
    maxAge: MAX_AGE,
    path: "/",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  });

  // Return cookie string for setting in Response headers
  const sameSite = process.env.NODE_ENV === "production" ? "None" : "Lax";
  const secure = process.env.NODE_ENV === "production" ? "Secure" : "";
  return `${SESSION_COOKIE_NAME}=${encrypted}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=${sameSite}${secure ? `; ${secure}` : ""}`;
}

// Destroy session
export async function destroySession(session: Session): Promise<string> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  // Return cookie string for clearing in Response headers
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

/**
 * Check if Onshape is authenticated (has valid access token)
 * For server components and route handlers
 */
export async function isOnshapeAuthenticated(): Promise<boolean> {
  const session = await getSession();
  const accessToken = session.get("onshapeAccessToken");
  return !!accessToken;
}

/**
 * Check if Onshape is authenticated (has valid access token)
 * For request-based usage (compatibility)
 */
export async function isOnshapeAuthenticatedFromRequest(
  request: Request
): Promise<boolean> {
  const session = await getSessionFromRequest(request);
  const accessToken = session.get("onshapeAccessToken");
  return !!accessToken;
}

/**
 * Get Onshape access token, refreshing if needed
 * For server components and route handlers
 */
export async function getOnshapeToken(): Promise<string | null> {
  try {
    const session = await getSession();
    return await getValidOnshapeTokenFromSession(session);
  } catch (error) {
    console.error("Error getting Onshape token:", error);
    return null;
  }
}

/**
 * Get Onshape access token, refreshing if needed
 * For request-based usage (compatibility)
 */
export async function getOnshapeTokenFromRequest(
  request: Request
): Promise<string | null> {
  try {
    const session = await getSessionFromRequest(request);
    return await getValidOnshapeTokenFromSession(session);
  } catch (error) {
    console.error("Error getting Onshape token:", error);
    return null;
  }
}

// Export Session type for use in other files
export type { Session };
