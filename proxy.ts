import { NextRequest, NextResponse } from "next/server";
import { isOnshapeAuthenticatedFromRequest } from "~/lib/onshapeAuth";

export default function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Skip authentication check for public routes
  if (pathname.startsWith("/signin") || pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  // Check if Onshape is authenticated
  const isAuthenticated = isOnshapeAuthenticatedFromRequest(request);

  if (!isAuthenticated) {
    // Preserve the full URL including query parameters for redirect
    const fullPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    // Redirect directly to Onshape auth
    const authUrl = new URL("/auth/onshape", request.url);
    authUrl.searchParams.set("redirect", fullPath);

    console.log("[PROXY] Not authenticated, redirecting to Onshape auth");
    console.log("[PROXY] Full path:", fullPath);

    return NextResponse.redirect(authUrl);
  }

  // User is authenticated, proceed with the request
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - we'll handle /api/onshape/* separately if needed)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
