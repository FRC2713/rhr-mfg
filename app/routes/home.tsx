import type { Route } from "./+types/home";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Sparkles,
  CheckCircle2,
  Box,
  ArrowRight,
  KanbanSquare,
} from "lucide-react";
import { Link, useSearchParams, redirect } from "react-router";
import {
  isOnshapeAuthenticated,
  getSession,
  commitSession,
} from "~/lib/session";
import { refreshOnshapeTokenIfNeededWithSession } from "~/lib/tokenRefresh";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Onshape Manufacturing Integration" },
    {
      name: "description",
      content:
        "View and manage Onshape CAD parts. Track manufacturing states and streamline your workflow.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const hasError = url.searchParams.has("error");

  // Check Onshape authentication first (required)
  const onshapeAuthenticated = await isOnshapeAuthenticated(request);

  // Get session once
  const session = await getSession(request);

  // If there's an error in the URL, don't redirect - let the page render with the error
  // This prevents redirect loops when OAuth callbacks fail
  if (hasError) {
    session.unset("onshapeAuthRedirectCount"); // Clear redirect counter
    return {
      onshapeAuthenticated: false,
      error: url.searchParams.get("error") || undefined,
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    };
  }

  // If not authenticated with Onshape, redirect to Onshape auth
  // Use a redirect counter to prevent infinite loops
  if (!onshapeAuthenticated) {
    const redirectCount = session.get("onshapeAuthRedirectCount") || 0;

    if (redirectCount < 2) {
      // Allow up to 2 redirects to handle OAuth flow
      session.set("onshapeAuthRedirectCount", redirectCount + 1);
      return redirect("/auth/onshape", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    } else {
      // Too many redirects - clear counter and show error
      session.unset("onshapeAuthRedirectCount");
      return {
        onshapeAuthenticated: false,
        error:
          "Unable to authenticate with Onshape. Please refresh the page or try opening in a new window.",
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      };
    }
  }

  // Clear redirect counter if authenticated
  session.unset("onshapeAuthRedirectCount");

  // Refresh tokens if needed (this updates the session)
  try {
    await refreshOnshapeTokenIfNeededWithSession(session);
  } catch (error) {
    // If refresh fails, clear tokens and redirect to auth
    console.error("Token refresh failed:", error);
  }

  // Commit session after potential token refresh
  const cookie = await commitSession(session);

  return {
    onshapeAuthenticated: true,
    headers: {
      "Set-Cookie": cookie,
    },
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { onshapeAuthenticated, error: loaderError } = loaderData;
  const [searchParams] = useSearchParams();
  const urlError = searchParams.get("error");
  const error = loaderError || urlError;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header Section */}
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="text-primary h-8 w-8" />
            <h1 className="text-4xl font-bold tracking-tight">
              Onshape Manufacturing Integration
            </h1>
          </div>
          <p className="text-muted-foreground text-xl">
            View and manage Onshape CAD parts. Track manufacturing states and
            streamline your workflow.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {onshapeAuthenticated && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Onshape Connected
              </Badge>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">
                Authentication error: {decodeURIComponent(error)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Authentication Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>Manage connection to Onshape</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Onshape</span>
                  {onshapeAuthenticated ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Not Connected</Badge>
                  )}
                </div>
              </div>
              {onshapeAuthenticated && (
                <p className="text-muted-foreground text-xs">
                  Successfully authenticated with Onshape. You can access
                  Onshape document data.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feature Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Box className="text-primary mb-2 h-6 w-6" />
              <CardTitle>Parts</CardTitle>
              <CardDescription>
                View and manage Onshape parts from Part Studios. Update part
                numbers and track manufacturing states.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="default">
                <Link to="/mfg/parts">
                  View Parts
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <KanbanSquare className="text-primary mb-2 h-6 w-6" />
              <CardTitle>Manufacturing</CardTitle>
              <CardDescription>
                Manage manufacturing workflow with the Kanban board. Track parts
                through different manufacturing states.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="default">
                <Link to="/mfg/kanban">
                  View Kanban
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
            <CardDescription>Documentation and API references</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://cad.onshape.com/help"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center justify-center gap-2 rounded-md px-3 text-sm text-xs font-medium whitespace-nowrap transition-colors"
              >
                Onshape Help
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
