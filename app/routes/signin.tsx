import type { Route } from "./+types/signin";
import { redirect } from "react-router";
import { getSession, commitSession, isOnshapeAuthenticated } from "~/lib/session";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Box, CheckCircle2 } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  const url = new URL(request.url);
  
  // Check for redirect in URL params, or use stored value from session, or default
  const urlRedirect = url.searchParams.get("redirect");
  const sessionRedirect = session.get("signInRedirect");
  const redirectTo = urlRedirect || sessionRedirect || "/mfg/parts";

  console.log("[SIGNIN] urlRedirect:", urlRedirect);
  console.log("[SIGNIN] sessionRedirect:", sessionRedirect);
  console.log("[SIGNIN] final redirectTo:", redirectTo);

  // Check authentication status
  const onshapeAuth = await isOnshapeAuthenticated(request);

  console.log("[SIGNIN] onshapeAuth:", onshapeAuth);

  // Store or update redirect path in session for after authentication
  if (urlRedirect && urlRedirect !== "/") {
    console.log("[SIGNIN] Storing urlRedirect in session:", urlRedirect);
    session.set("signInRedirect", urlRedirect);
  } else if (!sessionRedirect && redirectTo !== "/") {
    console.log("[SIGNIN] Storing redirectTo in session:", redirectTo);
    session.set("signInRedirect", redirectTo);
  }

  // If authenticated, redirect to the intended destination
  if (onshapeAuth) {
    console.log("[SIGNIN] Onshape authenticated, redirecting to:", redirectTo);
    // Clear the signInRedirect from session after using it
    session.unset("signInRedirect");
    const cookie = await commitSession(session);
    
    return redirect(redirectTo, {
      headers: {
        "Set-Cookie": cookie,
      },
    });
  }

  const cookie = await commitSession(session);

  return {
    onshapeAuth,
    redirectTo,
    headers: {
      "Set-Cookie": cookie,
    },
  };
}

export default function SignIn({ loaderData }: Route.ComponentProps) {
  const { onshapeAuth, redirectTo } = loaderData;

  const handleOnshapeAuth = () => {
    // Redirect to Onshape auth - will return to /signin after
    window.location.href = `/auth/onshape?redirect=${encodeURIComponent("/signin")}`;
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Box className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Sign In Required</CardTitle>
          <CardDescription className="text-center">
            Connect your Onshape account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Onshape Authentication */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Onshape</h3>
              {onshapeAuth && (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs">Connected</span>
                </div>
              )}
            </div>
            <Button
              onClick={handleOnshapeAuth}
              variant={onshapeAuth ? "outline" : "default"}
              className="w-full"
              disabled={onshapeAuth}
            >
              {onshapeAuth ? "Onshape Connected" : "Connect Onshape"}
            </Button>
          </div>

          {/* Status Message */}
          {onshapeAuth && (
            <div className="pt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Onshape connected! Redirecting...
              </p>
            </div>
          )}

          {!onshapeAuth && (
            <div className="pt-4 text-center">
              <p className="text-sm text-muted-foreground">
                You need to connect your Onshape account to access manufacturing parts
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

