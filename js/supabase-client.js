import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/** @type {import("@supabase/supabase-js").SupabaseClient | null} */
let cachedClient = null;

/**
 * Resolves Supabase URL & anon key from window.__APP_CONFIG__ (importing ./config.js if needed)
 * and returns a singleton Supabase client.
 *
 * @returns {Promise<import("@supabase/supabase-js").SupabaseClient>}
 */
export async function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  let cfg =
    (typeof window !== "undefined" && window.__APP_CONFIG__) ||
    (typeof globalThis !== "undefined" && globalThis.__APP_CONFIG__) ||
    null;

  if (!cfg || (!cfg.SUPABASE_URL && !cfg.supabaseUrl)) {
    try {
      await import("./config.js");
    } catch {
      // Abaikan jika config.js belum ter-generate
    }
    cfg =
      (typeof window !== "undefined" && window.__APP_CONFIG__) ||
      (typeof globalThis !== "undefined" && globalThis.__APP_CONFIG__) ||
      {};
  }

  const supabaseUrl = String(
    cfg.SUPABASE_URL || cfg.supabaseUrl || cfg.VITE_SUPABASE_URL || ""
  ).trim();
  const supabaseAnonKey = String(
    cfg.SUPABASE_ANON_KEY || cfg.supabaseAnonKey || cfg.VITE_SUPABASE_ANON_KEY || ""
  ).trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Konfigurasi Supabase belum tersedia. Pastikan SUPABASE_URL dan SUPABASE_ANON_KEY sudah diisi di Environment Variables Vercel / file .env."
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return cachedClient;
}