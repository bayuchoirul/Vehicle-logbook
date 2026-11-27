import { getSupabaseClient } from "../supabase-client.js";
import { calculateLitersFromCost } from "../utils/metrics.js";

/** @type {import("../types.js").FuelPriceOption[]} */
export const DEFAULT_FUEL_PRICES = [
  { brand: "Pertamina", product_name: "Pertalite", ron: 90, price_per_liter: 10000 },
  { brand: "Pertamina", product_name: "Pertamax", ron: 92, price_per_liter: 12100 },
  { brand: "Pertamina", product_name: "Pertamax Green 95", ron: 95, price_per_liter: 13150 },
  { brand: "Pertamina", product_name: "Pertamax Turbo", ron: 98, price_per_liter: 13500 },
  { brand: "Pertamina", product_name: "Dexlite", ron: null, price_per_liter: 13050 },
  { brand: "Pertamina", product_name: "Pertamina Dex", ron: null, price_per_liter: 13450 },
  { brand: "Shell", product_name: "Shell Super", ron: 92, price_per_liter: 12290 },
  { brand: "Shell", product_name: "Shell V-Power", ron: 95, price_per_liter: 13340 },
  { brand: "Shell", product_name: "Shell V-Power Nitro+", ron: 98, price_per_liter: 13570 },
  { brand: "BP", product_name: "BP 92", ron: 92, price_per_liter: 12290 },
  { brand: "BP", product_name: "BP Ultimate", ron: 95, price_per_liter: 13340 },
  { brand: "Vivo", product_name: "Revvo 90", ron: 90, price_per_liter: 11900 },
  { brand: "Vivo", product_name: "Revvo 92", ron: 92, price_per_liter: 12200 },
  { brand: "Vivo", product_name: "Revvo 95", ron: 95, price_per_liter: 13200 }
];

async function getCurrentUserId() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sesi login tidak valid. Silakan masuk ulang.");
  }
  return data.user.id;
}

/**
 * @returns {Promise<import("../types.js").FuelPriceOption[]>}
 */
export async function listFuelPrices() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("fuel_prices")
      .select("id, brand, product_name, ron, price_per_liter, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !Array.isArray(data) || data.length === 0) {
      return [...DEFAULT_FUEL_PRICES];
    }
    return data;
  } catch {
    return [...DEFAULT_FUEL_PRICES];
  }
}

/**
 * @returns {Promise<import("../types.js").Vehicle[]>}
 */
export async function listVehicles() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * @param {Partial<import("../types.js").Vehicle>} payload
 * @returns {Promise<import("../types.js").Vehicle>}
 */
export async function createVehicle(payload) {
  const userId = await getCurrentUserId();
  const supabase = getSupabaseClient();

  const name = String(payload.name || "").trim();
  if (!name) throw new Error("Nama kendaraan wajib diisi.");

  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      user_id: userId,
      name,
      plate_number: String(payload.plate_number || "").trim() || null,
      brand_model: String(payload.brand_model || "").trim() || null,
      fuel_type: String(payload.fuel_type || "Pertamax").trim(),
      tank_capacity_liters: Number(payload.tank_capacity_liters) || 3.7,
      initial_odometer_km: Math.max(0, Number(payload.initial_odometer_km) || 0),
      tax_due_date: payload.tax_due_date || null,
      plate_due_date: payload.plate_due_date || null
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * @param {string} vehicleId
 * @param {Partial<import("../types.js").Vehicle>} updates
 * @returns {Promise<import("../types.js").Vehicle>}
 */
export async function updateVehicle(vehicleId, updates) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("vehicles")
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("id", vehicleId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * @param {string} vehicleId
 * @returns {Promise<import("../types.js").FuelLog[]>}
 */
export async function listFuelLogs(vehicleId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("fuel_logs")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("logged_at", { ascending: false })
    .order("odometer_km", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * @param {Partial<import("../types.js").FuelLog>} payload
 * @returns {Promise<import("../types.js").FuelLog>}
 */
export async function createFuelLog(payload) {
  const userId = await getCurrentUserId();
  const supabase = getSupabaseClient();

  const totalCost = Number(payload.total_cost);
  const pricePerLiter = Number(payload.price_per_liter);
  const liters =
    Number(payload.liters) > 0
      ? Number(payload.liters)
      : calculateLitersFromCost(totalCost, pricePerLiter);

  if (liters <= 0) {
    throw new Error("Total biaya dan harga per liter harus lebih besar dari 0.");
  }

  const { data, error } = await supabase
    .from("fuel_logs")
    .insert({
      user_id: userId,
      vehicle_id: payload.vehicle_id,
      logged_at: payload.logged_at,
      odometer_km: Number(payload.odometer_km),
      liters,
      price_per_liter: pricePerLiter,
      total_cost: totalCost,
      fuel_brand: String(payload.fuel_brand || "Pertamax").trim(),
      station_name: String(payload.station_name || "").trim() || null,
      is_full_tank: Boolean(payload.is_full_tank),
      notes: String(payload.notes || "").trim() || null
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * @param {string} id
 * @param {Partial<import("../types.js").FuelLog>} payload
 */
export async function updateFuelLog(id, payload) {
  const supabase = getSupabaseClient();
  const totalCost = Number(payload.total_cost);
  const pricePerLiter = Number(payload.price_per_liter);
  const liters = calculateLitersFromCost(totalCost, pricePerLiter);

  const { data, error } = await supabase
    .from("fuel_logs")
    .update({
      logged_at: payload.logged_at,
      odometer_km: Number(payload.odometer_km),
      liters,
      price_per_liter: pricePerLiter,
      total_cost: totalCost,
      fuel_brand: String(payload.fuel_brand || "Pertamax").trim(),
      station_name: String(payload.station_name || "").trim() || null,
      is_full_tank: Boolean(payload.is_full_tank),
      notes: String(payload.notes || "").trim() || null
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * @param {string} id
 */
export async function deleteFuelLog(id) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * @param {string} vehicleId
 * @returns {Promise<import("../types.js").MaintenanceLog[]>}
 */
export async function listMaintenanceLogs(vehicleId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("maintenance_logs")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("logged_at", { ascending: false })
    .order("odometer_km", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * @param {Partial<import("../types.js").MaintenanceLog>} payload
 * @returns {Promise<import("../types.js").MaintenanceLog>}
 */
export async function createMaintenanceLog(payload) {
  const userId = await getCurrentUserId();
  const supabase = getSupabaseClient();

  const title = String(payload.title || "").trim();
  if (!title) throw new Error("Judul / pekerjaan servis wajib diisi.");

  const { data, error } = await supabase
    .from("maintenance_logs")
    .insert({
      user_id: userId,
      vehicle_id: payload.vehicle_id,
      logged_at: payload.logged_at,
      odometer_km: Number(payload.odometer_km),
      category: String(payload.category || "other"),
      title,
      workshop_name: String(payload.workshop_name || "").trim() || null,
      total_cost: Math.max(0, Number(payload.total_cost) || 0),
      next_due_km: payload.next_due_km ? Number(payload.next_due_km) : null,
      notes: String(payload.notes || "").trim() || null
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * @param {string} id
 * @param {Partial<import("../types.js").MaintenanceLog>} payload
 */
export async function updateMaintenanceLog(id, payload) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("maintenance_logs")
    .update({
      logged_at: payload.logged_at,
      odometer_km: Number(payload.odometer_km),
      category: String(payload.category || "other"),
      title: String(payload.title || "").trim(),
      workshop_name: String(payload.workshop_name || "").trim() || null,
      total_cost: Math.max(0, Number(payload.total_cost) || 0),
      next_due_km: payload.next_due_km ? Number(payload.next_due_km) : null,
      notes: String(payload.notes || "").trim() || null
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * @param {string} id
 */
export async function deleteMaintenanceLog(id) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("maintenance_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}