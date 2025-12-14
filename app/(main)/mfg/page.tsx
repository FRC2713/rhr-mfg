import { redirect } from "next/navigation";

/**
 * Redirect /mfg to /mfg/kanban as the default route
 */
export default function MfgPage() {
  redirect("/mfg/kanban");
}
