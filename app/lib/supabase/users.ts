/**
 * User utility functions for Supabase
 * Handles user data operations related to Onshape authentication
 */

import { supabase } from "./client";
import type { UserRow } from "./database.types";

/**
 * Upsert a user record (insert or update if exists)
 * @param onshapeUserId - The Onshape user ID (primary key)
 * @param firstName - The user's first name from Onshape (can be null)
 * @param lastName - The user's last name from Onshape (can be null)
 * @returns The user record or null if operation fails
 */
export async function upsertUser(
  onshapeUserId: string,
  firstName: string | null,
  lastName?: string | null
): Promise<UserRow | null> {
  try {
    // Construct name as "FirstName L" where L is the first initial of last name
    let name: string | null = null;
    if (firstName) {
      if (lastName && lastName.length > 0) {
        const lastInitial = lastName.charAt(0).toUpperCase();
        name = `${firstName} ${lastInitial}`;
      } else {
        name = firstName;
      }
    }

    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          onshape_user_id: onshapeUserId,
          name,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "onshape_user_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("[Users] Error upserting user:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("[Users] Exception upserting user:", error);
    return null;
  }
}

/**
 * Get user by Onshape user ID
 * @param onshapeUserId - The Onshape user ID to look up
 * @returns The user's name (first name + last initial) or null if not found
 */
export async function getUserById(
  onshapeUserId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("name")
      .eq("onshape_user_id", onshapeUserId)
      .single();

    if (error) {
      // User not found is not necessarily an error - return null
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      console.error("[Users] Error fetching user:", error);
      return null;
    }

    return data?.name || null;
  } catch (error) {
    console.error("[Users] Exception fetching user:", error);
    return null;
  }
}

/**
 * Get full user record by Onshape user ID
 * @param onshapeUserId - The Onshape user ID to look up
 * @returns The full user record or null if not found
 */
export async function getUserRecordById(
  onshapeUserId: string
): Promise<UserRow | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("onshape_user_id", onshapeUserId)
      .single();

    if (error) {
      // User not found is not necessarily an error - return null
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      console.error("[Users] Error fetching user record:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("[Users] Exception fetching user record:", error);
    return null;
  }
}
