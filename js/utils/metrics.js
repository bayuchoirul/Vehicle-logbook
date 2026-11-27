/**
 * Domain calculations, formatting, and telemetry helpers for Vehicle Logbook.
 */

export const MAINTENANCE_CATEGORIES = {
  oil_change: "Ganti Oli Mesin / Gardan",
  cvt_belt: "Servis CVT / V-Belt / Roller",
  tires: "Ban & Tekanan Angin",
  brakes: "Kampas & Minyak Rem",
  battery: "Aki & Kelistrikan",
  tune_up: "Tune Up & Injeksi",
  other: "Lainnya"
};

/**
 * @type {Record<string, number>}
 */
export const DEFAULT_SERVICE_INTERVALS_KM = {
  oil_change: 2000,
  cvt_belt: 8000,
  tires: 15000,
  brakes: 10000,
  battery: 20000,
  tune_up: 4000
};

/**
 * @param {number} amount
 * @returns {string}
 */
export function formatIDR(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Math.round(num));
}

/**
 * @param {number} value
 * @param {number} [decimals=1]
 * @returns {string}
 */
export function formatNumber(value, decimals = 1) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

/**
 * @param {number} liters
 * @returns {string}
 */
export function formatLiters(liters) {
  const num = Number(liters);
  if (!Number.isFinite(num) || num < 0) return "0,00 L";
  return `${formatNumber(num, 2)} L`;
}

/**
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDateID(isoDate) {
  if (!isoDate) return "—";
  const parsed = new Date(`${String(isoDate).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(isoDate);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(parsed);
}

/**
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
  return Math.round((cost / price) * 1000) / 1000;
}

/**
 * @param {import("../types.js").FuelLog[]} fuelLogs
 * @returns {Array<{id: string, logged_at: string, odometer_km: number, distance_km: number, liters_used: number, km_per_liter: number}>}
 */
export function calculateFuelEfficiencySeries(fuelLogs) {
  if (!Array.isArray(fuelLogs) || fuelLogs.length < 2) return [];

  const sorted = [...fuelLogs].sort((a, b) => {
    const dateDiff = String(a.logged_at).localeCompare(String(b.logged_at));
    if (dateDiff !== 0) return dateDiff;
    return Number(a.odometer_km) - Number(b.odometer_km);
  });

  /** @type {Array<{id: string, logged_at: string, odometer_km: number, distance_km: number, liters_used: number, km_per_liter: number}>} */
  const points = [];
  let anchorOdo = null;
  let pendingLiters = 0;

  for (const log of sorted) {
    const odo = Number(log.odometer_km);
    const liters = Number(log.liters);
    if (!Number.isFinite(odo) || !Number.isFinite(liters) || liters <= 0) continue;

    if (anchorOdo === null) {
      if (log.is_full_tank) {
        anchorOdo = odo;
        pendingLiters = 0;
      }
      continue;
    }

    pendingLiters += liters;

    if (log.is_full_tank) {
      const distance = odo - anchorOdo;
      if (distance > 0 && pendingLiters > 0) {
        points.push({
          id: log.id,
          logged_at: log.logged_at,
          odometer_km: odo,
          distance_km: Number(distance.toFixed(1)),
          liters_used: Number(pendingLiters.toFixed(3)),
          km_per_liter: Number((distance / pendingLiters).toFixed(2))
        });
      }
      anchorOdo = odo;
      pendingLiters = 0;
    }
  }

  return points;
}

/**
 * @param {import("../types.js").Vehicle | null} vehicle
 * @param {import("../types.js").FuelLog[]} fuelLogs
 * @param {import("../types.js").MaintenanceLog[]} maintenanceLogs
 */
export function summarizeVehicleTelemetry(vehicle, fuelLogs, maintenanceLogs) {
  const initialOdo = Number(vehicle?.initial_odometer_km ?? 0);
  const allOdos = [
    initialOdo,
    ...fuelLogs.map((f) => Number(f.odometer_km) || 0),
    ...maintenanceLogs.map((m) => Number(m.odometer_km) || 0)
  ];

  const currentOdometer = allOdos.length ? Math.max(...allOdos) : 0;
  const trackedDistance = Math.max(0, currentOdometer - initialOdo);

  const totalFuelCost = fuelLogs.reduce((acc, f) => acc + (Number(f.total_cost) || 0), 0);
  const totalFuelLiters = fuelLogs.reduce((acc, f) => acc + (Number(f.liters) || 0), 0);
  const totalMaintenanceCost = maintenanceLogs.reduce(
    (acc, m) => acc + (Number(m.total_cost) || 0),
    0
  );
  const totalSpend = totalFuelCost + totalMaintenanceCost;

  const efficiencySeries = calculateFuelEfficiencySeries(fuelLogs);
  const totalEffDistance = efficiencySeries.reduce((acc, p) => acc + p.distance_km, 0);
  const totalEffLiters = efficiencySeries.reduce((acc, p) => acc + p.liters_used, 0);

  const avgKmPerLiter =
    totalEffLiters > 0 ? Number((totalEffDistance / totalEffLiters).toFixed(2)) : null;
  const lastKmPerLiter =
    efficiencySeries.length > 0
      ? efficiencySeries[efficiencySeries.length - 1].km_per_liter
      : null;

  const costPerKm =
    trackedDistance > 0 ? Math.round(totalSpend / trackedDistance) : null;

  return {
    currentOdometer,
    trackedDistance,
    totalFuelCost,
    totalFuelLiters: Number(totalFuelLiters.toFixed(2)),
    totalMaintenanceCost,
    totalSpend,
    avgKmPerLiter,
    lastKmPerLiter,
    costPerKm,
    efficiencySeries
  };
}

/**
 * @param {import("../types.js").MaintenanceLog[]} maintenanceLogs
 * @param {number} currentOdometer
 * @param {number} [warningThresholdKm=500]
 */
export function summarizeServiceReminders(
  maintenanceLogs,
  currentOdometer,
  warningThresholdKm = 500
) {
  /** @type {Map<string, import("../types.js").MaintenanceLog>} */
  const latestByCategory = new Map();

  for (const log of maintenanceLogs) {
    const existing = latestByCategory.get(log.category);
    if (!existing || Number(log.odometer_km) >= Number(existing.odometer_km)) {
      latestByCategory.set(log.category, log);
    }
  }

  /** @type {Array<{category: string, categoryLabel: string, title: string, nextDueKm: number, remainingKm: number, overdue: boolean}>} */
  const reminders = [];

  for (const log of latestByCategory.values()) {
    const nextDue = Number(log.next_due_km);
    if (!Number.isFinite(nextDue) || nextDue <= 0) continue;

    const remainingKm = Math.round(nextDue - currentOdometer);
    if (remainingKm <= warningThresholdKm) {
      reminders.push({
        category: log.category,
        categoryLabel: MAINTENANCE_CATEGORIES[log.category] || log.category,
        title: log.title,
        nextDueKm: nextDue,
        remainingKm,
        overdue: remainingKm < 0
      });
    }
  }

  return reminders.sort((a, b) => a.remainingKm - b.remainingKm);
}

/**
 * @param {import("../types.js").FuelLog[]} fuelLogs
 * @param {import("../types.js").MaintenanceLog[]} maintenanceLogs
 * @param {number} [months=6]
 */
export function summarizeMonthlySpend(fuelLogs, maintenanceLogs, months = 6) {
  const now = new Date();
  /** @type {Array<{key: string, label: string, fuel: number, maintenance: number, total: number}>} */
  const buckets = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("id-ID", {
      month: "short",
      year: "2-digit"
    }).format(d);
    buckets.push({ key, label, fuel: 0, maintenance: 0, total: 0 });
  }

  const bucketMap = new Map(buckets.map((b) => [b.key, b]));

  for (const f of fuelLogs) {
    const key = String(f.logged_at || "").slice(0, 7);
    const bucket = bucketMap.get(key);
    if (bucket) {
      bucket.fuel += Number(f.total_cost) || 0;
      bucket.total = bucket.fuel + bucket.maintenance;
    }
  }

  for (const m of maintenanceLogs) {
    const key = String(m.logged_at || "").slice(0, 7);
    const bucket = bucketMap.get(key);
    if (bucket) {
      bucket.maintenance += Number(m.total_cost) || 0;
      bucket.total = bucket.fuel + bucket.maintenance;
    }
  }

  return buckets;
}

/**
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

/**
 * Summarizes STNK annual tax and 5-year plate reminders, including whether the
 * "Sudah Bayar" action button should be displayed:
 * - Annual STNK tax ('tax'): shown when <= 60 days remaining (hidden once paid & extended > 60 days).
 * - 5-year plate renewal ('plate'): shown only starting H-7 (<= 7 days remaining).
 *
 * @param {import("../types.js").Vehicle | null} vehicle
 * @param {string} [referenceIsoDate]
 * @returns {Array<{kind: 'tax' | 'plate', label: string, dueDate: string, daysRemaining: number, overdue: boolean, urgent: boolean, canPay: boolean}>}
 */
export function summarizeTaxReminders(vehicle, referenceIsoDate) {
  if (!vehicle) return [];

  const todayStr =
    referenceIsoDate ||
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const todayMs = Date.parse(`${todayStr}T00:00:00Z`);
  if (Number.isNaN(todayMs)) return [];

  const MS_PER_DAY = 86400000;
  /** @type {Array<{kind: 'tax' | 'plate', label: string, dueDate: string, daysRemaining: number, overdue: boolean, urgent: boolean, canPay: boolean}>} */
  const items = [];

  const targets = [
    {
      kind: /** @type {const} */ ("tax"),
      label: "Pajak Tahunan (STNK)",
      raw: vehicle.tax_due_date,
      payWindowDays: 60
    },
    {
      kind: /** @type {const} */ ("plate"),
      label: "Ganti Plat 5 Tahunan",
      raw: vehicle.plate_due_date,
      payWindowDays: 7
    }
  ];

  for (const t of targets) {
    if (!t.raw) continue;
    const dueStr = String(t.raw).slice(0, 10);
    const dueMs = Date.parse(`${dueStr}T00:00:00Z`);
    if (Number.isNaN(dueMs)) continue;

    const daysRemaining = Math.round((dueMs - todayMs) / MS_PER_DAY);
    items.push({
      kind: t.kind,
      label: t.label,
      dueDate: dueStr,
      daysRemaining,
      overdue: daysRemaining < 0,
      urgent: daysRemaining <= 30,
      canPay: daysRemaining <= t.payWindowDays
    });
  }

  return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Calculates the next tax or 5-year plate due date by adding 1 or 5 years
 * while preserving the original month and day (handling leap years safely).
 *
 * @param {string | null | undefined} currentDueDate
 * @param {'tax' | 'plate'} kind
 * @param {string} [fallbackIsoDate]
 * @returns {string}
 */
export function calculateNextTaxDueDate(currentDueDate, kind, fallbackIsoDate) {
  const yearsToAdd = kind === "plate" ? 5 : 1;
  const baseStr = String(currentDueDate || fallbackIsoDate || "").slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(baseStr);

  if (!match) {
    const now = new Date();
    const targetYear = now.getFullYear() + yearsToAdd;
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${targetYear}-${month}-${day}`;
  }

  const year = Number(match[1]) + yearsToAdd;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const maxDayInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Math.min(day, maxDayInMonth);

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
    safeDay
  ).padStart(2, "0")}`;
}

/**
 * @param {import("../types.js").FuelLog[]} fuelLogs
 * @returns {Array<{brand: string, fillCount: number, totalLiters: number, totalCost: number, avgPricePerLiter: number}>}
 */
export function summarizeFuelBrandBreakdown(fuelLogs) {
  if (!Array.isArray(fuelLogs) || fuelLogs.length === 0) return [];

  /** @type {Map<string, {brand: string, fillCount: number, totalLiters: number, totalCost: number}>} */
  const map = new Map();

  for (const log of fuelLogs) {
    const brand = String(log.fuel_brand || "BBM").trim() || "BBM";
    const liters = Number(log.liters) || 0;
    const cost = Number(log.total_cost) || 0;
    if (liters <= 0 && cost <= 0) continue;

    const current = map.get(brand) || {
      brand,
      fillCount: 0,
      totalLiters: 0,
      totalCost: 0
    };
    current.fillCount += 1;
    current.totalLiters += liters;
    current.totalCost += cost;
    map.set(brand, current);
  }

  return [...map.values()]
    .map((item) => ({
      brand: item.brand,
      fillCount: item.fillCount,
      totalLiters: Number(item.totalLiters.toFixed(2)),
      totalCost: Math.round(item.totalCost),
      avgPricePerLiter:
        item.totalLiters > 0 ? Math.round(item.totalCost / item.totalLiters) : 0
    }))
    .sort((a, b) => b.totalCost - a.totalCost);
}