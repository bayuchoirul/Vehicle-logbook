import { getSupabaseClient } from "../supabase-client.js";

/**
 * @param {unknown} error
 * @param {string} fallback
 * @returns {Error}
 */
function normalizeAuthError(error, fallback) {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : fallback;

  const lower = raw.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return new Error("Email atau kata sandi tidak sesuai.");
  }
  if (lower.includes("email not confirmed")) {
    return new Error("Email belum dikonfirmasi. Silakan cek kotak masuk atau folder spam Anda.");
  }
  if (lower.includes("user already registered")) {
    return new Error("Email ini sudah terdaftar. Silakan masuk atau gunakan fitur lupa kata sandi.");
  }
  if (lower.includes("password should be at least")) {
    return new Error("Kata sandi minimal harus terdiri dari 6 karakter.");
  }
  if (lower.includes("rate limit")) {
    return new Error("Terlalu banyak percobaan. Silakan tunggu beberapa menit lalu coba lagi.");
  }
  return new Error(raw || fallback);
}

/**
 * @param {string} email
 * @param {string} password
 */
export async function signInWithPassword(email, password) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || "").trim(),
    password: String(password || "")
  });
  if (error) throw normalizeAuthError(error, "Gagal masuk ke akun.");
  return data;
}

/**
 * @param {string} email
 * @param {string} password
 */
export async function signUpWithEmail(email, password) {
  const supabase = getSupabaseClient();
  const redirectTo = `${window.location.origin}/login.html`;
  const { data, error } = await supabase.auth.signUp({
    email: String(email || "").trim(),
    password: String(password || ""),
    options: { emailRedirectTo: redirectTo }
  });
  if (error) throw normalizeAuthError(error, "Gagal mendaftarkan akun baru.");
  return data;
}

/**
 * @param {string} email
 */
export async function sendPasswordResetEmail(email) {
  const supabase = getSupabaseClient();
  const redirectTo = `${window.location.origin}/login.html`;
  const { error } = await supabase.auth.resetPasswordForEmail(String(email || "").trim(), {
    redirectTo
  });
  if (error) throw normalizeAuthError(error, "Gagal mengirim tautan pemulihan kata sandi.");
}

/**
 * @param {string} newPassword
 */
export async function updateUserPassword(newPassword) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({
    password: String(newPassword || "")
  });
  if (error) throw normalizeAuthError(error, "Gagal memperbarui kata sandi.");
  return data;
}

/**
 * @param {(event: string, session: any) => void} callback
 */
export function onAuthStateChange(callback) {
  const supabase = getSupabaseClient();
  return supabase.auth.onAuthStateChange(callback);
}

export async function getSession() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw normalizeAuthError(error, "Gagal memeriksa sesi login.");
  return data.session;
}

/**
 * @param {string} [loginPath="./login.html"]
 */
export async function requireAuth(loginPath = "./login.html") {
  const session = await getSession();
  if (!session?.user) {
    window.location.replace(loginPath);
    throw new Error("AUTH_REDIRECT");
  }
  return session.user;
}

/**
 * @param {string} [dashboardPath="./index.html"]
 */
export async function redirectIfAuthenticated(dashboardPath = "./index.html") {
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  if (hash.includes("type=recovery") || search.includes("type=recovery")) {
    return null;
  }

  const session = await getSession();
  if (session?.user) {
    window.location.replace(dashboardPath);
    return session.user;
  }
  return null;
}

/**
 * @param {string} [loginPath="./login.html"]
 */
export async function signOut(loginPath = "./login.html") {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
  window.location.replace(loginPath);
}