import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/src/env";

export const createClient = () =>
  createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    global: {
      headers: {
        "sb-lb-routing-mode": "alpha-all-services",
      },
    },
  });
