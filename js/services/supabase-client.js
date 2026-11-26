import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { APP_CONFIG } from "../config.js";

/** @type {import("@supabase/supabase-js").SupabaseClient | null} */
let cachedClient = null;

/**
 * Returns true when valid Supabase credentials are configured.
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  const url = APP_CONFIG.supabaseUrl;
  const key = APP_CONFIG.supabaseAnonKey;
  return Boolean(
    url &&
      key &&
      url.startsWith("https://") &&
      !url.includes("your-project-ref") &&
      !key.includes("your-supabase-anon-key")
  );
}

/**
 * Returns the singleton Supabase client instance.
 * @returns {import("@supabase/supabase-js").SupabaseClient}
 */
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Konfigurasi Supabase belum diisi. Set SUPABASE_URL dan SUPABASE_ANON_KEY di Vercel atau file .env lalu jalankan `npm run build`."
    );
  }
  if (!cachedClient) {
    cachedClient = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return cachedClient;
}