import { getSupabaseClient } from "../supabase-client.js";

/**
 * Retrieves the currently authenticated Supabase user, or null if not signed in.
 * @returns {Promise<import("@supabase/supabase-js").User | null>}
 */
export async function getCurrentUser() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return null;
  }
  return data.user;
}

/**
 * Ensures a user session exists; redirects to loginUrl and throws AUTH_REDIRECT otherwise.
 * @param {string} [loginUrl="./login.html"]
 * @returns {Promise<import("@supabase/supabase-js").User>}
 */
export async function requireAuth(loginUrl = "./login.html") {
  const user = await getCurrentUser();
  if (!user) {
    window.location.replace(loginUrl);
    throw new Error("AUTH_REDIRECT");
  }
  return user;
}

/**
 * Redirects already authenticated users away from the login page to the dashboard.
 * @param {string} [dashboardUrl="./"]
 */
export async function redirectIfAuthenticated(dashboardUrl = "./") {
  const user = await getCurrentUser();
  if (user) {
    window.location.replace(dashboardUrl);
  }
}

/**
 * Signs in with email and password via Supabase Auth.
 * @param {string} email
 * @param {string} password
 */
export async function signInWithEmail(email, password) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || "").trim(),
    password: String(password || "")
  });
  if (error) {
    throw new Error(error.message || "Gagal login. Periksa email dan kata sandi.");
  }
  return data.user;
}

/**
 * Signs out the active user and redirects to loginUrl.
 * @param {string} [loginUrl="./login.html"]
 */
export async function signOut(loginUrl = "./login.html") {
  const supabase = await getSupabaseClient();
  await supabase.auth.signOut();
  window.location.replace(loginUrl);
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
/**
 * Masuk menggunakan email dan kata sandi.
 * @param {string} email
 * @param {string} password
 */
export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}