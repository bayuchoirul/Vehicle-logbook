import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/** @type {import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm").SupabaseClient | null} */
let cachedClient = null;

/**
 * Resolves Supabase URL & anon key from window.__APP_CONFIG__ or ./config.js
 * and returns a singleton Supabase client.
 *
 * @returns {Promise<import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm").SupabaseClient>}
 */
export async function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  let importedCfg = {};
  try {
    const mod = await import("./config.js");
    importedCfg = mod?.SUPABASE_CONFIG || mod?.default || {};
  } catch {
    // Abaikan jika config.js belum ter-generate
  }

  const globalCfg =
    (typeof window !== "undefined" && /** @type {any} */ (window).__APP_CONFIG__) ||
    (typeof globalThis !== "undefined" && /** @type {any} */ (globalThis).__APP_CONFIG__) ||
    {};

  const supabaseUrl = String(
    importedCfg.url ||
      importedCfg.SUPABASE_URL ||
      globalCfg.SUPABASE_URL ||
      globalCfg.supabaseUrl ||
      globalCfg.VITE_SUPABASE_URL ||
      ""
  ).trim();

  const supabaseAnonKey = String(
    importedCfg.anonKey ||
      importedCfg.SUPABASE_ANON_KEY ||
      globalCfg.SUPABASE_ANON_KEY ||
      globalCfg.supabaseAnonKey ||
      globalCfg.VITE_SUPABASE_ANON_KEY ||
      ""
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