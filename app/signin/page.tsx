import { redirect } from "next/navigation";
import { isOnshapeAuthenticated } from "~/lib/onshapeAuth";
import { SignInClient } from "./signin-client";

export default async function SignIn({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  // Check for redirect in URL params, or default
  const redirectTo = searchParams.redirect || "/mfg/parts";

  console.log("[SIGNIN] redirectTo:", redirectTo);

  // Check authentication status
  const onshapeAuth = await isOnshapeAuthenticated();

  console.log("[SIGNIN] onshapeAuth:", onshapeAuth);

  // If authenticated, redirect to the intended destination
  if (onshapeAuth) {
    console.log("[SIGNIN] Onshape authenticated, redirecting to:", redirectTo);
    return redirect(redirectTo);
  }

  return <SignInClient onshapeAuth={onshapeAuth} redirectTo={redirectTo} />;
}
