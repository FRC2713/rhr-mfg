import { NextResponse } from "next/server";
import { isOnshapeAuthenticated } from "~/lib/session";

export async function GET() {
  const onshapeAuthenticated = await isOnshapeAuthenticated();

  return NextResponse.json({
    onshape: {
      authenticated: onshapeAuthenticated,
    },
  });
}
