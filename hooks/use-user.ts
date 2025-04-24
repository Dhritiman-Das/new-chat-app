import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

const supabase = createClient();

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setError(error);
        setUser(null);
      } else {
        setUser(data.user ?? null);
      }
      setLoading(false);
    }

    fetchUser();

    // Optional: subscribe to auth state changes to update user automatically
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading, error };
}
