import { NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase/client";

export async function GET(request: NextRequest) {
  const { data, error } = await supabase.from("users").select("*");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
