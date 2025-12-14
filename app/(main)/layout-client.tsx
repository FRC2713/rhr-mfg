"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Home, RefreshCw, User, LogIn, LogOut } from "lucide-react";

function getBreadcrumbs(pathname: string) {
  const paths = pathname.split("/").filter(Boolean);
  const breadcrumbs: Array<{ label: string; href: string }> = [];

  // Route label mapping for better display names
  const routeLabels: Record<string, string> = {
    mfg: "MFG",
    tasks: "Tasks",
    projects: "Projects",
  };

  // If we're at home, just return home breadcrumb
  if (pathname === "/") {
    return [{ label: "Home", href: "/" }];
  }

  // Always start with Home
  breadcrumbs.push({ label: "Home", href: "/" });

  // Build breadcrumbs from path segments
  let currentPath = "";
  paths.forEach((segment) => {
    currentPath += `/${segment}`;

    // Use mapped label if available, otherwise format the segment
    const label =
      routeLabels[segment] ||
      segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    breadcrumbs.push({ label, href: currentPath });
  });

  return breadcrumbs;
}

export function MainLayoutClient({
  children,
  isAuthenticated,
  onshapeAuth,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
  onshapeAuth: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const breadcrumbs = getBreadcrumbs(pathname);

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Breadcrumbs */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                const isHome = crumb.label === "Home";
                return (
                  <div key={crumb.href} className="flex items-center">
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>
                          {isHome ? (
                            <span className="flex items-center gap-1.5">
                              <Home className="h-4 w-4" />
                              {crumb.label}
                            </span>
                          ) : (
                            crumb.label
                          )}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>
                            {isHome ? (
                              <span className="flex items-center gap-1.5">
                                <Home className="h-4 w-4" />
                                {crumb.label}
                              </span>
                            ) : (
                              crumb.label
                            )}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator />}
                  </div>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-8"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <User className="h-4 w-4" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Authentication</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {isAuthenticated ? (
                  <>
                    <div className="text-muted-foreground px-2 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        <span>Onshape Connected</span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/auth/logout" className="flex items-center">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    {onshapeAuth && (
                      <div className="text-muted-foreground px-2 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          <span>Onshape Connected</span>
                        </div>
                      </div>
                    )}
                    {onshapeAuth && <DropdownMenuSeparator />}
                    <DropdownMenuItem asChild>
                      <Link href="/signin" className="flex items-center">
                        <LogIn className="mr-2 h-4 w-4" />
                        <span>Sign In</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Route content */}
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
