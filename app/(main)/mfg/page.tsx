import { redirect } from "next/navigation";

/**
 * Redirect /mfg to /mfg/parts as the default route
 */
export default function MfgPage() {
  redirect("/mfg/parts");
}
