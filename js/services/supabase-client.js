import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SUPABASE_CONFIG } from "./config.js";

/** @type {import("https://esm.sh/@supabase/supabase-js@2.49.1").SupabaseClient | null} */
let clientInstance = null;

export function getSupabaseClient() {
  if (clientInstance) return clientInstance;

  const url = String(SUPABASE_CONFIG?.url || "").trim();
  const anonKey = String(SUPABASE_CONFIG?.anonKey || "").trim();

  if (!url || !anonKey) {
    throw new Error(
      "Konfigurasi Supabase belum tersedia. Pastikan SUPABASE_URL dan SUPABASE_ANON_KEY diatur di Vercel Environment Variables."
    );
  }

  clientInstance = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return clientInstance;
}