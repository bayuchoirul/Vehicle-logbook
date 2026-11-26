import { getSupabaseClient } from "./vehicle-service.js";

export async function getSession() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(`Gagal memeriksa sesi login: ${error.message}`);
  }
  return data?.session ?? null;
}

export async function requireAuth(redirectTo = "/login.html") {
  const session = await getSession();
  if (!session?.user) {
    window.location.replace(redirectTo);
    return null;
  }
  return session;
}

export async function signInWithEmail(email, password) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email).trim(),
    password: String(password),
  });
  if (error) {
    throw new Error(error.message || "Email atau kata sandi tidak valid.");
  }
  return data;
}

export async function signUpWithEmail(email, password) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(email).trim(),
    password: String(password),
  });
  if (error) {
    throw new Error(error.message || "Gagal mendaftarkan akun baru.");
  }
  return data;
}

export async function signOut(redirectTo = "/login.html") {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message || "Gagal keluar dari sesi.");
  }
  window.location.replace(redirectTo);
}
