import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  // eslint-disable-next-line no-console
  console.warn("Supabase credentials are missing. Database features will fail until .env is configured.");
}

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
