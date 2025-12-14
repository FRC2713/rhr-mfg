import { redirect } from "next/navigation";
import { destroySession, getSession } from "~/lib/session";

export async function GET() {
  const session = await getSession();

  // Destroy session and redirect to home
  const cookie = await destroySession(session);
  const response = redirect("/");
  response.headers.set("Set-Cookie", cookie);
  return response;
}
