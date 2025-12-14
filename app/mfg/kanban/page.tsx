import { redirect } from "next/navigation";
import {
  isOnshapeAuthenticated,
  getSession,
  commitSession,
} from "~/lib/session";
import { MfgKanbanClient } from "./kanban-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kanban Board - Manufacturing",
  description: "Configure your Kanban board columns",
};

export default async function MfgKanban() {
  // Check Onshape authentication
  const onshapeAuthenticated = await isOnshapeAuthenticated();

  if (!onshapeAuthenticated) {
    return redirect("/signin?redirect=/mfg/kanban");
  }

  await commitSession(await getSession());

  return <MfgKanbanClient />;
}
