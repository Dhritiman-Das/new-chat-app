import { createClient } from "@/utils/supabase/server";

// Simple interface for a user session
export interface Session {
  user?: {
    id: string;
    name?: string;
    email?: string;
  };
}

/**
 * Get the current user session using Supabase Auth
 */
export async function auth(): Promise<Session | null> {
  try {
    // Create Supabase server client
    const supabase = await createClient();

    // Get current user from Supabase auth
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error("Error fetching user:", error);
      return null;
    }

    // Get additional user data from the database if needed
    const { data: profile } = await supabase
      .from("users")
      .select("name")
      .eq("id", user.id)
      .single();

    // Return the user session
    return {
      user: {
        id: user.id,
        name:
          profile?.name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0],
        email: user.email,
      },
    };
  } catch (error) {
    console.error("Error in auth function:", error);
    return null;
  }
}
