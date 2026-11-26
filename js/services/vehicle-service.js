import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_CONFIG } from "../config/env.js";

let supabaseClient = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
      throw new Error("Konfigurasi SUPABASE_URL atau SUPABASE_ANON_KEY belum terpasang di Vercel.");
    }
    supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseClient;
}

export async function requireAuthenticatedUser() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
  }
  return data.user;
}

export async function listVehicles() {
  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();

  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Gagal memuat data kendaraan: ${error.message}`);
  return data ?? [];
}

export async function ensureDefaultVehicle() {
  const existing = await listVehicles();
  if (existing.length > 0) return existing;

  const created = await createVehicle({
    name: "Honda Vario 110 eSP",
    model: "Honda Vario 110 eSP",
    fuel_type: "Pertamax",
    tank_capacity_liters: 3.7,
    initial_odometer_km: 0,
  });
  return [created];
}

export async function createVehicle(payload) {
  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();

  const record = {
    user_id: user.id,
    name: String(payload.name || "Honda Vario 110 eSP").trim(),
    model: String(payload.model || "Honda Vario 110 eSP").trim(),
    license_plate: payload.license_plate ? String(payload.license_plate).trim().toUpperCase() : null,
    fuel_type: String(payload.fuel_type || "Pertamax").trim(),
    tank_capacity_liters: Number(payload.tank_capacity_liters ?? 3.7),
    initial_odometer_km: Number(payload.initial_odometer_km ?? 0),
  };

  const { data, error } = await supabase.from("vehicles").insert(record).select().single();
  if (error) throw new Error(`Gagal menambahkan kendaraan: ${error.message}`);
  return data;
}

export async function listFuelLogs(vehicleId) {
  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();

  const { data, error } = await supabase
    .from("fuel_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("vehicle_id", vehicleId)
    .order("logged_at", { ascending: false })
    .order("odometer_km", { ascending: false });

  if (error) throw new Error(`Gagal memuat log BBM: ${error.message}`);
  return data ?? [];
}

export async function createFuelLog(payload) {
  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();

  const liters = Number(payload.liters);
  const pricePerLiter =
    payload.price_per_liter !== null && payload.price_per_liter !== undefined && payload.price_per_liter !== ""
      ? Number(payload.price_per_liter)
      : null;

  const computedCost =
    payload.total_cost !== null && payload.total_cost !== undefined && payload.total_cost !== ""
      ? Number(payload.total_cost)
      : Math.round((pricePerLiter ?? 0) * liters);

  const record = {
    user_id: user.id,
    vehicle_id: payload.vehicle_id,
    logged_at: payload.logged_at || new Date().toISOString().slice(0, 10),
    odometer_km: Number(payload.odometer_km),
    liters,
    price_per_liter: pricePerLiter,
    total_cost: computedCost,
    fuel_type: String(payload.fuel_type || "Pertamax").trim(),
    is_full_tank: Boolean(payload.is_full_tank),
    station_name: payload.station_name ? String(payload.station_name).trim() : null,
    notes: payload.notes ? String(payload.notes).trim() : null,
  };

  const { data, error } = await supabase.from("fuel_logs").insert(record).select().single();
  if (error) throw new Error(`Gagal menyimpan log BBM: ${error.message}`);
  return data;
}

export async function deleteFuelLog(logId) {
  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();

  const { error } = await supabase
    .from("fuel_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", user.id);

  if (error) throw new Error(`Gagal menghapus log BBM: ${error.message}`);
}

export async function listMaintenanceLogs(vehicleId) {
  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();

  const { data, error } = await supabase
    .from("maintenance_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("vehicle_id", vehicleId)
    .order("service_date", { ascending: false })
    .order("odometer_km", { ascending: false });

  if (error) throw new Error(`Gagal memuat log servis: ${error.message}`);
  return data ?? [];
}

export async function createMaintenanceLog(payload) {
  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();

  const record = {
    user_id: user.id,
    vehicle_id: payload.vehicle_id,
    service_date: payload.service_date || new Date().toISOString().slice(0, 10),
    odometer_km: Number(payload.odometer_km),
    service_type: String(payload.service_type).trim(),
    cost: Number(payload.cost ?? 0),
    workshop_name: payload.workshop_name ? String(payload.workshop_name).trim() : null,
    notes: payload.notes ? String(payload.notes).trim() : null,
  };

  const { data, error } = await supabase.from("maintenance_logs").insert(record).select().single();
  if (error) throw new Error(`Gagal menyimpan log servis: ${error.message}`);
  return data;
}

export async function deleteMaintenanceLog(logId) {
  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();

  const { error } = await supabase
    .from("maintenance_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", user.id);

  if (error) throw new Error(`Gagal menghapus log servis: ${error.message}`);
}

export async function listComponentSchedules(vehicleId) {
  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();

  const { data, error } = await supabase
    .from("component_schedules")
    .select("*")
    .eq("user_id", user.id)
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Gagal memuat jadwal komponen: ${error.message}`);
  return data ?? [];
}

export async function createComponentSchedule(payload) {
  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();

  const record = {
    user_id: user.id,
    vehicle_id: payload.vehicle_id,
    component_name: String(payload.component_name).trim(),
    last_replaced_km: Number(payload.last_replaced_km ?? 0),
    interval_km: Number(payload.interval_km ?? 2000),
    notes: payload.notes ? String(payload.notes).trim() : null,
  };

  const { data, error } = await supabase
    .from("component_schedules")
    .insert(record)
    .select()
    .single();
  if (error) throw new Error(`Gagal menyimpan jadwal komponen: ${error.message}`);
  return data;
}

export async function resetComponentSchedule(scheduleId, currentOdometerKm) {
  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();

  const { error } = await supabase
    .from("component_schedules")
    .update({ last_replaced_km: Number(currentOdometerKm) })
    .eq("id", scheduleId)
    .eq("user_id", user.id);

  if (error) throw new Error(`Gagal memperbarui kilometer komponen: ${error.message}`);
}

export async function deleteComponentSchedule(scheduleId) {
  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();

  const { error } = await supabase
    .from("component_schedules")
    .delete()
    .eq("id", scheduleId)
    .eq("user_id", user.id);

  if (error) throw new Error(`Gagal menghapus jadwal komponen: ${error.message}`);
}
