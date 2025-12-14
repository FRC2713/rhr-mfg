import { redirect } from "next/navigation";
import {
  getSession,
  commitSession,
  isOnshapeAuthenticated,
} from "~/lib/session";
import { SignInClient } from "./signin-client";

export default async function SignIn({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const session = await getSession();

  // Check for redirect in URL params, or use stored value from session, or default
  const urlRedirect = searchParams.redirect;
  const sessionRedirect = session.get("signInRedirect") as string | undefined;
  const redirectTo = urlRedirect || sessionRedirect || "/mfg/parts";

  console.log("[SIGNIN] urlRedirect:", urlRedirect);
  console.log("[SIGNIN] sessionRedirect:", sessionRedirect);
  console.log("[SIGNIN] final redirectTo:", redirectTo);

  // Check authentication status
  const onshapeAuth = await isOnshapeAuthenticated();

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

    const response = redirect(redirectTo);
    response.headers.set("Set-Cookie", cookie);
    return response;
  }

  await commitSession(session);

  return <SignInClient onshapeAuth={onshapeAuth} redirectTo={redirectTo} />;
}
