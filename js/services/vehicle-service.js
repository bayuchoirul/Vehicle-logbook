import { getSupabaseClient } from "../supabase-client.js";
import { getCurrentUser } from "./auth-service.js";
import { calculateLitersFromCost } from "../utils/metrics.js";

/**
 * Fallback fuel price reference list if fuel_prices table is empty or unreachable.
 * @type {import("../types.js").FuelPriceOption[]}
 */
export const DEFAULT_FUEL_PRICES = [
  { brand: "Pertamina", product_name: "Pertalite", ron: 90, price_per_liter: 10000, sort_order: 10 },
  { brand: "Pertamina", product_name: "Pertamax", ron: 92, price_per_liter: 12100, sort_order: 20 },
  { brand: "Pertamina", product_name: "Pertamax Green 95", ron: 95, price_per_liter: 13150, sort_order: 30 },
  { brand: "Pertamina", product_name: "Pertamax Turbo", ron: 98, price_per_liter: 13500, sort_order: 40 },
  { brand: "Shell", product_name: "Shell Super", ron: 92, price_per_liter: 12290, sort_order: 50 },
  { brand: "Shell", product_name: "Shell V-Power", ron: 95, price_per_liter: 13340, sort_order: 60 },
  { brand: "Shell", product_name: "Shell V-Power Nitro+", ron: 98, price_per_liter: 13570, sort_order: 70 },
  { brand: "BP", product_name: "BP 92", ron: 92, price_per_liter: 12290, sort_order: 80 },
  { brand: "BP", product_name: "BP Ultimate", ron: 95, price_per_liter: 13340, sort_order: 90 },
  { brand: "Vivo", product_name: "Revvo 90", ron: 90, price_per_liter: 11900, sort_order: 100 },
  { brand: "Vivo", product_name: "Revvo 92", ron: 92, price_per_liter: 12290, sort_order: 110 },
  { brand: "Vivo", product_name: "Revvo 95", ron: 95, price_per_liter: 13340, sort_order: 120 }
];

/**
 * Fetches active Indonesia retail fuel prices from Supabase, falling back to local defaults.
 * @returns {Promise<import("../types.js").FuelPriceOption[]>}
 */
export async function listFuelPrices() {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("fuel_prices")
      .select("id, brand, product_name, ron, price_per_liter, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !Array.isArray(data) || data.length === 0) {
      return [...DEFAULT_FUEL_PRICES];
    }

    return data.map((row) => ({
      ...row,
      price_per_liter: Number(row.price_per_liter) || 0
    }));
  } catch {
    return [...DEFAULT_FUEL_PRICES];
  }
}

/**
 * @returns {Promise<import("../types.js").Vehicle[]>}
 */
export async function listVehicles() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Gagal memuat daftar kendaraan: ${error.message}`);
  return data || [];
}

/**
 * @param {Partial<import("../types.js").Vehicle>} payload
 * @returns {Promise<import("../types.js").Vehicle>}
 */
export async function createVehicle(payload) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesi login tidak ditemukan.");

  const name = String(payload.name || "").trim();
  if (!name) throw new Error("Nama kendaraan wajib diisi.");

  const row = {
    user_id: user.id,
    name,
    plate_number: String(payload.plate_number || "").trim(),
    brand_model: String(payload.brand_model || "").trim(),
    fuel_type: String(payload.fuel_type || "Pertamax").trim() || "Pertamax",
    tank_capacity_liters: Number(payload.tank_capacity_liters ?? 3.7),
    initial_odometer_km: Number(payload.initial_odometer_km ?? 0),
    tax_due_date: payload.tax_due_date ? String(payload.tax_due_date).trim() : null,
    plate_due_date: payload.plate_due_date ? String(payload.plate_due_date).trim() : null
  };

  if (row.tank_capacity_liters <= 0) {
    throw new Error("Kapasitas tangki harus lebih besar dari 0 liter.");
  }
  if (row.initial_odometer_km < 0) {
    throw new Error("Odometer awal tidak boleh bernilai negatif.");
  }

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("vehicles")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`Gagal menyimpan kendaraan: ${error.message}`);
  return data;
}

/**
 * @param {string} id
 * @param {Partial<import("../types.js").Vehicle>} patch
 */
export async function updateVehicle(id, patch) {
  const cleanPatch = { ...patch };
  if ("tax_due_date" in cleanPatch) {
    cleanPatch.tax_due_date = cleanPatch.tax_due_date
      ? String(cleanPatch.tax_due_date).trim()
      : null;
  }
  if ("plate_due_date" in cleanPatch) {
    cleanPatch.plate_due_date = cleanPatch.plate_due_date
      ? String(cleanPatch.plate_due_date).trim()
      : null;
  }

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("vehicles")
    .update(cleanPatch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Gagal memperbarui kendaraan: ${error.message}`);
  return data;
}

/**
 * @param {string} vehicleId
 * @returns {Promise<import("../types.js").FuelLog[]>}
 */
export async function listFuelLogs(vehicleId) {
  if (!vehicleId) return [];
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("fuel_logs")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("logged_at", { ascending: false })
    .order("odometer_km", { ascending: false });

  if (error) throw new Error(`Gagal memuat catatan BBM: ${error.message}`);
  return data || [];
}

/**
 * @param {Partial<import("../types.js").FuelLog>} payload
 * @returns {Promise<import("../types.js").FuelLog>}
 */
export async function createFuelLog(payload) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesi login tidak ditemukan.");
  if (!payload.vehicle_id) throw new Error("Pilih kendaraan terlebih dahulu.");

  const odometer_km = Number(payload.odometer_km);
  const price_per_liter = Number(payload.price_per_liter);
  const explicitCost = Number(payload.total_cost);
  const explicitLiters = Number(payload.liters);

  if (!Number.isFinite(odometer_km) || odometer_km < 0) {
    throw new Error("Odometer harus berupa angka valid (>= 0).");
  }
  if (!Number.isFinite(price_per_liter) || price_per_liter <= 0) {
    throw new Error("Harga per liter harus lebih besar dari 0.");
  }

  let total_cost = 0;
  let liters = 0;

  if (Number.isFinite(explicitCost) && explicitCost > 0) {
    total_cost = Math.round(explicitCost);
    liters = calculateLitersFromCost(total_cost, price_per_liter);
  } else if (Number.isFinite(explicitLiters) && explicitLiters > 0) {
    liters = Number(explicitLiters.toFixed(3));
    total_cost = Math.round(liters * price_per_liter);
  } else {
    throw new Error("Total bayar (Rp) harus lebih besar dari 0.");
  }

  if (liters <= 0) {
    throw new Error("Volume liter terhitung tidak valid. Periksa total bayar dan harga BBM.");
  }

  const row = {
    user_id: user.id,
    vehicle_id: payload.vehicle_id,
    logged_at: payload.logged_at || new Date().toISOString().slice(0, 10),
    odometer_km,
    liters,
    price_per_liter,
    total_cost,
    fuel_brand: String(payload.fuel_brand || "Pertamax").trim() || "Pertamax",
    station_name: String(payload.station_name || "").trim(),
    is_full_tank: payload.is_full_tank !== false,
    notes: String(payload.notes || "").trim()
  };

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("fuel_logs")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`Gagal menyimpan catatan BBM: ${error.message}`);
  return data;
}

/**
 * @param {string} id
 * @param {Partial<import("../types.js").FuelLog>} patch
 */
export async function updateFuelLog(id, patch) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("fuel_logs")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Gagal memperbarui catatan BBM: ${error.message}`);
  return data;
}

/**
 * @param {string} id
 */
export async function deleteFuelLog(id) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
  if (error) throw new Error(`Gagal menghapus catatan BBM: ${error.message}`);
}

/**
 * @param {string} vehicleId
 * @returns {Promise<import("../types.js").MaintenanceLog[]>}
 */
export async function listMaintenanceLogs(vehicleId) {
  if (!vehicleId) return [];
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("maintenance_logs")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("logged_at", { ascending: false })
    .order("odometer_km", { ascending: false });

  if (error) throw new Error(`Gagal memuat catatan servis: ${error.message}`);
  return data || [];
}

/**
 * @param {Partial<import("../types.js").MaintenanceLog>} payload
 * @returns {Promise<import("../types.js").MaintenanceLog>}
 */
export async function createMaintenanceLog(payload) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesi login tidak ditemukan.");
  if (!payload.vehicle_id) throw new Error("Pilih kendaraan terlebih dahulu.");

  const odometer_km = Number(payload.odometer_km);
  const total_cost = Number(payload.total_cost);
  const title = String(payload.title || "").trim();

  if (!title) throw new Error("Deskripsi servis / penggantian wajib diisi.");
  if (!Number.isFinite(odometer_km) || odometer_km < 0) {
    throw new Error("Odometer harus berupa angka valid (>= 0).");
  }
  if (!Number.isFinite(total_cost) || total_cost < 0) {
    throw new Error("Biaya servis tidak boleh negatif.");
  }

  const nextDueRaw = payload.next_due_km;
  const next_due_km =
    nextDueRaw === "" || nextDueRaw === null || nextDueRaw === undefined
      ? null
      : Number(nextDueRaw);

  const row = {
    user_id: user.id,
    vehicle_id: payload.vehicle_id,
    logged_at: payload.logged_at || new Date().toISOString().slice(0, 10),
    odometer_km,
    category: payload.category || "other",
    title,
    workshop_name: String(payload.workshop_name || "").trim(),
    total_cost,
    next_due_km: Number.isFinite(next_due_km) ? next_due_km : null,
    notes: String(payload.notes || "").trim()
  };

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("maintenance_logs")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`Gagal menyimpan catatan servis: ${error.message}`);
  return data;
}

/**
 * @param {string} id
 * @param {Partial<import("../types.js").MaintenanceLog>} patch
 */
export async function updateMaintenanceLog(id, patch) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("maintenance_logs")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Gagal memperbarui catatan servis: ${error.message}`);
  return data;
}

/**
 * @param {string} id
 */
export async function deleteMaintenanceLog(id) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("maintenance_logs").delete().eq("id", id);
  if (error) throw new Error(`Gagal menghapus catatan servis: ${error.message}`);
}