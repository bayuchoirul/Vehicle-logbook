/**
 * Pure telemetry & financial calculation helpers for Vehicle Logbook.
 */

export const MAINTENANCE_CATEGORIES = Object.freeze({
  oil_change: "Ganti Oli Mesin / Gardan",
  cvt_belt: "Servis CVT / V-Belt / Roller",
  tires: "Ban & Tekanan Angin",
  brakes: "Kampas & Minyak Rem",
  battery: "Aki & Kelistrikan",
  tune_up: "Tune Up & Injeksi",
  other: "Lainnya"
});

/**
 * Computes purchased fuel volume in liters from total transaction cost and price per liter.
 * Rounded to 3 decimal places (standard SPBU dispenser precision).
 *
 * @param {number} totalCost
 * @param {number} pricePerLiter
 * @returns {number}
 */
export function calculateLitersFromCost(totalCost, pricePerLiter) {
  const cost = Number(totalCost);
  const price = Number(pricePerLiter);
  if (!Number.isFinite(cost) || !Number.isFinite(price) || cost <= 0 || price <= 0) {
    return 0;
  }
  return Number((cost / price).toFixed(3));
}

/**
 * Computes full-to-full fuel efficiency points (km/L and Rp/km).
 * Intermediate partial fill-ups (`is_full_tank === false`) are accumulated until the next full fill-up.
 *
 * @param {import("../types.js").FuelLog[]} fuelLogs
 * @returns {import("../types.js").FuelEfficiencyPoint[]}
 */
export function calculateFuelEfficiencySeries(fuelLogs) {
  if (!Array.isArray(fuelLogs) || fuelLogs.length < 2) return [];

  const ascending = [...fuelLogs].sort((a, b) => {
    const odoDiff = Number(a.odometer_km) - Number(b.odometer_km);
    if (odoDiff !== 0) return odoDiff;
    return String(a.logged_at).localeCompare(String(b.logged_at));
  });

  /** @type {import("../types.js").FuelEfficiencyPoint[]} */
  const points = [];
  /** @type {number | null} */
  let anchorOdometer = null;
  let pendingLiters = 0;
  let pendingCost = 0;

  for (const log of ascending) {
    const odo = Number(log.odometer_km);
    const liters = Number(log.liters);
    const cost = Number(log.total_cost);
    const isFull = log.is_full_tank !== false;

    if (!Number.isFinite(odo) || !Number.isFinite(liters) || liters <= 0) {
      continue;
    }

    if (anchorOdometer === null) {
      if (isFull) {
        anchorOdometer = odo;
        pendingLiters = 0;
        pendingCost = 0;
      }
      continue;
    }

    pendingLiters += liters;
    pendingCost += Number.isFinite(cost) ? cost : 0;

    if (isFull) {
      const distance = odo - anchorOdometer;
      if (distance > 0 && pendingLiters > 0) {
        const kmPerLiter = distance / pendingLiters;
        const costPerKm = pendingCost / distance;
        points.push({
          id: log.id,
          logged_at: log.logged_at,
          odometer_km: odo,
          distance_km: Number(distance.toFixed(1)),
          liters: Number(pendingLiters.toFixed(3)),
          km_per_liter: Number(kmPerLiter.toFixed(2)),
          cost_per_km: Math.round(costPerKm),
          total_cost: Math.round(pendingCost)
        });
      }
      anchorOdometer = odo;
      pendingLiters = 0;
      pendingCost = 0;
    }
  }

  return points;
}

/**
 * Aggregates complete dashboard metrics for a vehicle.
 *
 * @param {import("../types.js").Vehicle | null} vehicle
 * @param {import("../types.js").FuelLog[]} fuelLogs
 * @param {import("../types.js").MaintenanceLog[]} maintenanceLogs
 * @returns {import("../types.js").DashboardMetrics}
 */
export function summarizeVehicleMetrics(vehicle, fuelLogs = [], maintenanceLogs = []) {
  const initialOdo = Number(vehicle?.initial_odometer_km ?? 0);
  let maxOdo = Math.max(initialOdo, Number(vehicle?.current_odometer_km ?? 0));

  let totalFuelCost = 0;
  let totalFuelLiters = 0;
  /** @type {Map<string, {month: string, fuelCost: number, maintenanceCost: number, totalCost: number}>} */
  const monthlyMap = new Map();

  for (const f of fuelLogs) {
    const odo = Number(f.odometer_km || 0);
    const cost = Number(f.total_cost || 0);
    const liters = Number(f.liters || 0);
    if (odo > maxOdo) maxOdo = odo;
    totalFuelCost += cost;
    totalFuelLiters += liters;

    const monthKey = String(f.logged_at || "").slice(0, 7) || "Unknown";
    const entry = monthlyMap.get(monthKey) || {
      month: monthKey,
      fuelCost: 0,
      maintenanceCost: 0,
      totalCost: 0
    };
    entry.fuelCost += cost;
    entry.totalCost += cost;
    monthlyMap.set(monthKey, entry);
  }

  let totalMaintenanceCost = 0;
  /** @type {Map<string, import("../types.js").MaintenanceLog>} */
  const latestServiceByCategory = new Map();

  for (const m of maintenanceLogs) {
    const odo = Number(m.odometer_km || 0);
    const cost = Number(m.total_cost || 0);
    if (odo > maxOdo) maxOdo = odo;
    totalMaintenanceCost += cost;

    const monthKey = String(m.logged_at || "").slice(0, 7) || "Unknown";
    const entry = monthlyMap.get(monthKey) || {
      month: monthKey,
      fuelCost: 0,
      maintenanceCost: 0,
      totalCost: 0
    };
    entry.maintenanceCost += cost;
    entry.totalCost += cost;
    monthlyMap.set(monthKey, entry);

    const existing = latestServiceByCategory.get(m.category);
    if (!existing || Number(m.odometer_km) > Number(existing.odometer_km)) {
      latestServiceByCategory.set(m.category, m);
    }
  }

  const efficiencySeries = calculateFuelEfficiencySeries(fuelLogs);
  let averageKmPerLiter = null;
  if (efficiencySeries.length > 0) {
    const sumDist = efficiencySeries.reduce((acc, p) => acc + p.distance_km, 0);
    const sumLiters = efficiencySeries.reduce((acc, p) => acc + p.liters, 0);
    averageKmPerLiter = sumLiters > 0 ? Number((sumDist / sumLiters).toFixed(2)) : null;
  }

  const lastKmPerLiter =
    efficiencySeries.length > 0
      ? efficiencySeries[efficiencySeries.length - 1].km_per_liter
      : null;

  const totalTrackedDistanceKm = Math.max(0, Number((maxOdo - initialOdo).toFixed(1)));
  const totalOperatingCost = Math.round(totalFuelCost + totalMaintenanceCost);
  const costPerKm =
    totalTrackedDistanceKm > 0
      ? Math.round(totalOperatingCost / totalTrackedDistanceKm)
      : null;

  const serviceReminders = [];
  for (const item of latestServiceByCategory.values()) {
    if (item.next_due_km !== null && item.next_due_km !== undefined) {
      const dueKm = Number(item.next_due_km);
      const remainingKm = Number((dueKm - maxOdo).toFixed(1));
      if (remainingKm <= 500) {
        serviceReminders.push({
          title: item.title,
          category: item.category,
          nextDueKm: dueKm,
          remainingKm,
          overdue: remainingKm < 0
        });
      }
    }
  }
  serviceReminders.sort((a, b) => a.remainingKm - b.remainingKm);

  const monthlySpend = [...monthlyMap.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  return {
    currentOdometerKm: maxOdo,
    totalTrackedDistanceKm,
    averageKmPerLiter,
    lastKmPerLiter,
    totalFuelCost: Math.round(totalFuelCost),
    totalFuelLiters: Number(totalFuelLiters.toFixed(2)),
    totalMaintenanceCost: Math.round(totalMaintenanceCost),
    totalOperatingCost,
    costPerKm,
    efficiencySeries,
    monthlySpend,
    serviceReminders
  };
}

/**
 * Formats integer/float currency into Indonesian Rupiah (e.g., Rp 45.000).
 * @param {number} amount
 * @returns {string}
 */
export function formatIDR(amount) {
  const num = Number(amount || 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Formats a number using id-ID separators.
 * @param {number | null | undefined} value
 * @param {number} [decimals=1]
 * @returns {string}
 */
export function formatNumber(value, decimals = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number(value));
}

/**
 * Formats YYYY-MM-DD into a compact Indonesian date string (e.g., 26 Nov 2026).
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDateID(isoDate) {
  if (!isoDate) return "—";
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(parsed);
}

/**
 * Formats fuel volume consistently with 2 decimal places (e.g., "2,20 L")
 * across KPIs, Recent Activity, modals, and Logbook tables.
 * @param {number | null | undefined} liters
 * @returns {string}
 */
export function formatLiters(liters) {
  if (liters === null || liters === undefined || !Number.isFinite(Number(liters))) {
    return "0,00 L";
  }
  return `${formatNumber(Number(liters), 2)} L`;
}

/**
 * Detects potential odometer ordering anomalies across existing logs for a vehicle.
 * Returns a human-readable Indonesian warning string or null when consistent.
 *
 * @param {Array<{id?: string, logged_at: string, odometer_km: number | string}>} logs
 * @param {number} targetOdometer
 * @param {string} targetDate
 * @param {string | null} [excludeId=null]
 * @returns {string | null}
 */
export function detectOdometerAnomaly(logs, targetOdometer, targetDate, excludeId = null) {
  const odo = Number(targetOdometer);
  if (!Array.isArray(logs) || !Number.isFinite(odo) || odo < 0 || !targetDate) {
    return null;
  }

  const candidates = logs.filter((item) => item && item.id !== excludeId);
  if (!candidates.length) return null;

  const sorted = [...candidates].sort((a, b) => {
    const dateCmp = String(a.logged_at).localeCompare(String(b.logged_at));
    if (dateCmp !== 0) return dateCmp;
    return Number(a.odometer_km) - Number(b.odometer_km);
  });

  const earlier = sorted.filter((item) => String(item.logged_at) <= String(targetDate));
  const later = sorted.filter((item) => String(item.logged_at) > String(targetDate));

  if (earlier.length > 0) {
    const prevMaxOdo = Math.max(...earlier.map((item) => Number(item.odometer_km) || 0));
    if (odo < prevMaxOdo) {
      return `Odometer (${formatNumber(odo, 0)} km) lebih kecil dari catatan sebelumnya (${formatNumber(
        prevMaxOdo,
        0
      )} km). Pastikan angka sudah sesuai.`;
    }
  }

  if (later.length > 0) {
    const nextMinOdo = Math.min(...later.map((item) => Number(item.odometer_km) || Infinity));
    if (Number.isFinite(nextMinOdo) && odo > nextMinOdo) {
      return `Odometer (${formatNumber(odo, 0)} km) lebih besar dari catatan setelahnya (${formatNumber(
        nextMinOdo,
        0
      )} km). Pastikan urutan tanggal dan odometer benar.`;
    }
  }

  return null;
}