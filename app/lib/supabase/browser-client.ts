"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createBrowserSupabaseClient() {
  if (!url || !anonKey) return null;
  return createClient<Database>(url, anonKey);
}
