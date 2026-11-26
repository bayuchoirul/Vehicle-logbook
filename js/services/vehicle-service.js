import { getSupabaseClient } from "./supabase-client.js";

/**
 * Resolves the currently authenticated user ID.
 * @returns {Promise<string>}
 */
async function getAuthenticatedUserId() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error("Sesi login tidak valid. Silakan login kembali.");
  }
  return data.user.id;
}

/**
 * Fetches all vehicles owned by the authenticated user.
 * @returns {Promise<import("../types.js").Vehicle[]>}
 */
export async function listVehicles() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Gagal memuat kendaraan: ${error.message}`);
  return data || [];
}

/**
 * Creates a new vehicle record.
 * @param {Partial<import("../types.js").Vehicle>} payload
 * @returns {Promise<import("../types.js").Vehicle>}
 */
export async function createVehicle(payload) {
  const userId = await getAuthenticatedUserId();
  const name = String(payload.name || "").trim();
  if (!name) throw new Error("Nama kendaraan wajib diisi.");

  const initialOdo = Number(payload.initial_odometer_km ?? 0);
  const currentOdo = Number(payload.current_odometer_km ?? initialOdo);
  const tankCapacity = Number(payload.tank_capacity_liters ?? 3.7);

  if (!Number.isFinite(initialOdo) || initialOdo < 0) {
    throw new Error("Odometer awal harus berupa angka >= 0.");
  }
  if (!Number.isFinite(tankCapacity) || tankCapacity <= 0) {
    throw new Error("Kapasitas tangki harus lebih dari 0 liter.");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      user_id: userId,
      name,
      plate_number: String(payload.plate_number || "").trim(),
      brand_model: String(payload.brand_model || "").trim(),
      fuel_type: String(payload.fuel_type || "Pertamax").trim(),
      tank_capacity_liters: tankCapacity,
      initial_odometer_km: initialOdo,
      current_odometer_km: Math.max(initialOdo, currentOdo)
    })
    .select()
    .single();

  if (error) throw new Error(`Gagal menyimpan kendaraan: ${error.message}`);
  return data;
}

/**
 * Updates vehicle metadata.
 * @param {string} vehicleId
 * @param {Partial<import("../types.js").Vehicle>} updates
 * @returns {Promise<import("../types.js").Vehicle>}
 */
export async function updateVehicle(vehicleId, updates) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("vehicles")
    .update(updates)
    .eq("id", vehicleId)
    .select()
    .single();

  if (error) throw new Error(`Gagal memperbarui kendaraan: ${error.message}`);
  return data;
}

/**
 * Fetches fuel logs for a specific vehicle sorted chronologically (newest first).
 * @param {string} vehicleId
 * @returns {Promise<import("../types.js").FuelLog[]>}
 */
export async function listFuelLogs(vehicleId) {
  if (!vehicleId) return [];
  const supabase = getSupabaseClient();
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
 * Validates and creates a new fuel log entry.
 * @param {Partial<import("../types.js").FuelLog>} payload
 * @returns {Promise<import("../types.js").FuelLog>}
 */
export async function createFuelLog(payload) {
  const userId = await getAuthenticatedUserId();
  if (!payload.vehicle_id) throw new Error("Kendaraan belum dipilih.");

  const odometerKm = Number(payload.odometer_km);
  const liters = Number(payload.liters);
  const pricePerLiter = Number(payload.price_per_liter);
  const totalCost =
    payload.total_cost !== undefined && payload.total_cost !== null && payload.total_cost !== ""
      ? Number(payload.total_cost)
      : Math.round(liters * pricePerLiter);

  if (!Number.isFinite(odometerKm) || odometerKm < 0) {
    throw new Error("Odometer harus valid (>= 0 km).");
  }
  if (!Number.isFinite(liters) || liters <= 0) {
    throw new Error("Jumlah liter BBM harus lebih dari 0.");
  }
  if (!Number.isFinite(pricePerLiter) || pricePerLiter < 0) {
    throw new Error("Harga per liter tidak valid.");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("fuel_logs")
    .insert({
      user_id: userId,
      vehicle_id: payload.vehicle_id,
      logged_at: payload.logged_at || new Date().toISOString().slice(0, 10),
      odometer_km: odometerKm,
      liters,
      price_per_liter: pricePerLiter,
      total_cost: totalCost,
      fuel_brand: String(payload.fuel_brand || "Pertamax").trim(),
      station_name: String(payload.station_name || "").trim(),
      is_full_tank: payload.is_full_tank !== false,
      notes: String(payload.notes || "").trim()
    })
    .select()
    .single();

  if (error) throw new Error(`Gagal menyimpan catatan BBM: ${error.message}`);
  return data;
}

/**
 * Updates an existing fuel log entry.
 * @param {string} id
 * @param {Partial<import("../types.js").FuelLog>} payload
 */
export async function updateFuelLog(id, payload) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("fuel_logs")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Gagal memperbarui catatan BBM: ${error.message}`);
  return data;
}

/**
 * Deletes a fuel log entry by ID.
 * @param {string} id
 */
export async function deleteFuelLog(id) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
  if (error) throw new Error(`Gagal menghapus catatan BBM: ${error.message}`);
}

/**
 * Fetches maintenance logs for a vehicle sorted chronologically (newest first).
 * @param {string} vehicleId
 * @returns {Promise<import("../types.js").MaintenanceLog[]>}
 */
export async function listMaintenanceLogs(vehicleId) {
  if (!vehicleId) return [];
  const supabase = getSupabaseClient();
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
 * Validates and creates a maintenance/service log entry.
 * @param {Partial<import("../types.js").MaintenanceLog>} payload
 * @returns {Promise<import("../types.js").MaintenanceLog>}
 */
export async function createMaintenanceLog(payload) {
  const userId = await getAuthenticatedUserId();
  if (!payload.vehicle_id) throw new Error("Kendaraan belum dipilih.");

  const title = String(payload.title || "").trim();
  if (!title) throw new Error("Judul pekerjaan servis wajib diisi.");

  const odometerKm = Number(payload.odometer_km);
  const totalCost = Number(payload.total_cost ?? 0);
  const nextDueKm =
    payload.next_due_km !== undefined && payload.next_due_km !== null && payload.next_due_km !== ""
      ? Number(payload.next_due_km)
      : null;

  if (!Number.isFinite(odometerKm) || odometerKm < 0) {
    throw new Error("Odometer servis harus valid (>= 0 km).");
  }
  if (!Number.isFinite(totalCost) || totalCost < 0) {
    throw new Error("Biaya servis tidak valid.");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("maintenance_logs")
    .insert({
      user_id: userId,
      vehicle_id: payload.vehicle_id,
      logged_at: payload.logged_at || new Date().toISOString().slice(0, 10),
      odometer_km: odometerKm,
      category: payload.category || "other",
      title,
      workshop_name: String(payload.workshop_name || "").trim(),
      total_cost: totalCost,
      next_due_km: nextDueKm,
      notes: String(payload.notes || "").trim()
    })
    .select()
    .single();

  if (error) throw new Error(`Gagal menyimpan catatan servis: ${error.message}`);
  return data;
}

/**
 * Updates an existing maintenance log entry.
 * @param {string} id
 * @param {Partial<import("../types.js").MaintenanceLog>} payload
 */
export async function updateMaintenanceLog(id, payload) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("maintenance_logs")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Gagal memperbarui catatan servis: ${error.message}`);
  return data;
}

/**
 * Deletes a maintenance log entry by ID.
 * @param {string} id
 */
export async function deleteMaintenanceLog(id) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("maintenance_logs").delete().eq("id", id);
  if (error) throw new Error(`Gagal menghapus catatan servis: ${error.message}`);
}
