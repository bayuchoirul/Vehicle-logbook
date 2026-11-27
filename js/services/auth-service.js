import { getSupabaseClient, isSupabaseConfigured } from "./supabase-client.js";

/**
 * Retrieves the active Supabase session, or null if not signed in.
 * @returns {Promise<import("@supabase/supabase-js").Session | null>}
 */
export async function getSession() {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Ensures the user is authenticated; otherwise redirects to /login.html.
 * @param {string} [loginPath="./login.html"]
 * @returns {Promise<import("@supabase/supabase-js").User>}
 */
export async function requireAuth(loginPath = "./login.html") {
  const session = await getSession();
  if (!session || !session.user) {
    const target = new URL(loginPath, window.location.href);
    window.location.replace(target.toString());
    throw new Error("AUTH_REDIRECT");
  }
  return session.user;
}

/**
 * Redirects already-authenticated users away from the login screen.
 * @param {string} [dashboardPath="./index.html"]
 */
export async function redirectIfAuthenticated(dashboardPath = "./index.html") {
  const session = await getSession();
  if (session && session.user) {
    const target = new URL(dashboardPath, window.location.href);
    window.location.replace(target.toString());
  }
}

/**
 * Signs in an existing user with email & password.
 * @param {string} email
 * @param {string} password
 */
export async function signInWithPassword(email, password) {
  const supabase = getSupabaseClient();
  const cleanEmail = String(email || "").trim();
  if (!cleanEmail || !password) {
    throw new Error("Email dan kata sandi wajib diisi.");
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password
  });
  if (error) throw error;
  return data;
}

/**
 * Registers a new user account with email & password.
 * @param {string} email
 * @param {string} password
 */
export async function signUpWithPassword(email, password) {
  const supabase = getSupabaseClient();
  const cleanEmail = String(email || "").trim();
  if (!cleanEmail || !password) {
    throw new Error("Email dan kata sandi wajib diisi.");
  }
  if (password.length < 6) {
    throw new Error("Kata sandi minimal 6 karakter.");
  }
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password
  });
  if (error) throw error;
  return data;
}

/**
 * Signs out the current user and redirects to login page.
 * @param {string} [loginPath="./login.html"]
 */
export async function signOut(loginPath = "./login.html") {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
  const target = new URL(loginPath, window.location.href);
  window.location.replace(target.toString());
}

/**
 * Mengirim tautan reset kata sandi ke email terdaftar.
 * @param {string} email
 */
export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`
  });
  if (error) throw error;
}

/**
 * Memperbarui kata sandi pengguna saat sesi recovery aktif.
 * @param {string} newPassword
 */
export async function updateUserPassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  if (error) throw error;
  return data;
}

/**
 * Mendengarkan perubahan event autentikasi Supabase (seperti PASSWORD_RECOVERY).
 * @param {(event: string, session: unknown) => void} callback
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}