import { redirect } from "next/navigation";
import { isOnshapeAuthenticated } from "~/lib/session";
import { refreshOnshapeTokenIfNeeded } from "~/lib/tokenRefresh";
import { HomeClient } from "./home-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kanban Board - Manufacturing",
  description: "Manage your manufacturing workflow with the Kanban board",
};

export default async function Home() {
  // Check Onshape authentication
  const onshapeAuthenticated = await isOnshapeAuthenticated();

  if (!onshapeAuthenticated) {
    return redirect("/signin?redirect=/");
  }

  // Refresh tokens if needed
  try {
    await refreshOnshapeTokenIfNeeded();
  } catch (error) {
    // If refresh fails, clear tokens and redirect to auth
    console.error("Token refresh failed:", error);
  }

  return <HomeClient />;
}
