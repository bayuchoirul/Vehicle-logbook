// public/js/core/auth-service.js
import { getSupabaseClient } from './supabase-client.js';

export async function getCurrentSession() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * @param {string} email
 * @param {string} password
 */
export async function signInWithEmail(email, password) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

/**
 * @param {string} email
 * @param {string} password
 */
export async function signUpWithEmail(email, password) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = await getSupabaseClient();
  await supabase.auth.signOut();
  window.location.href = '/login';
}
