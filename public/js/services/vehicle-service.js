// public/js/services/vehicle-service.js
import { getSupabaseClient } from '../core/supabase-client.js';
import { calculateFuelEfficiency } from '../domain/fuel-analytics.js';

/**
 * Memastikan user memiliki profil kendaraan default (Honda Vario 110 eSP) saat pertama login.
 * @param {string} userId
 */
export async function ensureDefaultVehicle(userId) {
  const supabase = await getSupabaseClient();
  const { data: existing, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (existing && existing.length > 0) return existing;

  const { data: created, error: insertErr } = await supabase
    .from('vehicles')
    .insert({
      user_id: userId,
      name: 'Honda Vario 110 eSP',
      brand_model: 'Honda Vario 110 eSP',
      tank_capacity_liters: 3.7,
      default_fuel_type: 'Pertamax',
      total_odometer_km: 0,
    })
    .select();

  if (insertErr) throw insertErr;
  return created ?? [];
}

/**
 * Menyimpan catatan pengisian BBM baru dan menghitung km/L otomatis dari full-tank terakhir.
 * @param {string} userId
 * @param {{
 *   vehicleId: string,
 *   date: string,
 *   odometerKm: number,
 *   liters: number,
 *   pricePerLiter: number,
 *   fuelType?: string,
 *   station?: string,
 *   isFullTank?: boolean,
 *   notes?: string
 * }} payload
 */
export async function createFuelLog(userId, payload) {
  const supabase = await getSupabaseClient();
  const isFullTank = payload.isFullTank !== false;

  const { data: prevLogs } = await supabase
    .from('vehicle_fuel_logs')
    .select('odometer_km, is_full_tank')
    .eq('user_id', userId)
    .eq('vehicle_id', payload.vehicleId)
    .eq('is_full_tank', true)
    .lt('odometer_km', payload.odometerKm)
    .order('odometer_km', { ascending: false })
    .limit(1);

  const prevFull = prevLogs?.[0]
    ? { odometerKm: Number(prevLogs[0].odometer_km), isFullTank: true }
    : null;

  const { tripDistanceKm, kmPerLiter } = calculateFuelEfficiency(
    { odometerKm: payload.odometerKm, liters: payload.liters, isFullTank },
    prevFull
  );

  const totalCost = Math.round(Number(payload.liters) * Number(payload.pricePerLiter));

  const { data, error } = await supabase
    .from('vehicle_fuel_logs')
    .insert({
      user_id: userId,
      vehicle_id: payload.vehicleId,
      date: payload.date,
      odometer_km: payload.odometerKm,
      trip_distance_km: tripDistanceKm,
      liters: payload.liters,
      price_per_liter: payload.pricePerLiter,
      total_cost: totalCost,
      fuel_type: payload.fuelType || 'Pertamax',
      station: (payload.station || '').trim(),
      is_full_tank: isFullTank,
      consumption_km_per_liter: kmPerLiter,
      notes: (payload.notes || '').trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Menghapus log pengisian BBM.
 * @param {string} id
 */
export async function deleteFuelLog(id) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('vehicle_fuel_logs').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Menyimpan catatan servis / penggantian suku cadang motor.
 * @param {string} userId
 * @param {{
 *   vehicleId: string,
 *   date: string,
 *   odometerKm: number,
 *   title: string,
 *   category: string,
 *   cost: number,
 *   workshop?: string,
 *   notes?: string
 * }} payload
 */
export async function createVehicleMaintenanceLog(userId, payload) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('vehicle_maintenance_logs')
    .insert({
      user_id: userId,
      vehicle_id: payload.vehicleId,
      date: payload.date,
      odometer_km: payload.odometerKm,
      title: payload.title.trim(),
      category: payload.category || 'Service',
      cost: Math.max(0, Number(payload.cost) || 0),
      workshop: (payload.workshop || '').trim(),
      notes: (payload.notes || '').trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Menghapus log servis kendaraan.
 * @param {string} id
 */
export async function deleteVehicleMaintenanceLog(id) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('vehicle_maintenance_logs').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Memuat seluruh ringkasan kendaraan, log BBM, log servis, dan aturan interval komponen.
 * @param {string} userId
 */
export async function fetchVehicleDashboardSnapshot(userId) {
  const supabase = await getSupabaseClient();
  const vehicles = await ensureDefaultVehicle(userId);

  const [fuelRes, maintRes, rulesRes] = await Promise.all([
    supabase
      .from('vehicle_fuel_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('odometer_km', { ascending: false }),
    supabase
      .from('vehicle_maintenance_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false }),
    supabase
      .from('vehicle_component_rules')
      .select('*')
      .order('default_max_km', { ascending: true }),
  ]);

  if (fuelRes.error) throw fuelRes.error;
  if (maintRes.error) throw maintRes.error;

  return {
    vehicles,
    fuelLogs: fuelRes.data ?? [],
    maintenanceLogs: maintRes.data ?? [],
    componentRules: rulesRes.data ?? [],
  };
}
