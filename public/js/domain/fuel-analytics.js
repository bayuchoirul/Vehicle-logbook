// public/js/domain/fuel-analytics.js

/**
 * Menghitung rasio konsumsi BBM (km/L) berdasarkan selisih odometer dari pengisian penuh sebelumnya.
 * @param {{ odometerKm: number, liters: number, isFullTank: boolean }} currentLog
 * @param {{ odometerKm: number, isFullTank: boolean } | null} previousFullLog
 * @returns {{ tripDistanceKm: number, kmPerLiter: number | null }}
 */
export function calculateFuelEfficiency(currentLog, previousFullLog) {
  const currentOdo = Number(currentLog.odometerKm || 0);
  const liters = Number(currentLog.liters || 0);

  if (!previousFullLog || currentOdo <= Number(previousFullLog.odometerKm || 0)) {
    return { tripDistanceKm: 0, kmPerLiter: null };
  }

  const tripDistanceKm = Number((currentOdo - Number(previousFullLog.odometerKm)).toFixed(2));
  const kmPerLiter =
    currentLog.isFullTank && liters > 0
      ? Number((tripDistanceKm / liters).toFixed(2))
      : null;

  return { tripDistanceKm, kmPerLiter };
}

/**
 * Menghitung status keausan komponen motor berdasarkan odometer saat ini dan riwayat servis terakhir.
 * @param {{
 *   currentOdometerKm: number,
 *   rules: Array<{
 *     id: string,
 *     category_name: string,
 *     badge_label: string,
 *     description: string,
 *     default_max_km: number,
 *     warn_threshold_pct: number,
 *     crit_threshold_pct: number
 *   }>,
 *   maintenanceLogs: Array<{
 *     title: string,
 *     category: string,
 *     odometer_km: number
 *   }>
 * }} params
 */
export function computeVehicleComponentStatus({ currentOdometerKm, rules, maintenanceLogs }) {
  const currentOdo = Number(currentOdometerKm || 0);

  return rules
    .map((rule) => {
      const maxKm = Number(rule.default_max_km || 3000);
      const warnPct = Number(rule.warn_threshold_pct || 75);
      const critPct = Number(rule.crit_threshold_pct || 90);

      const lastService = maintenanceLogs
        .filter(
          (m) =>
            String(m.title || '').toLowerCase().includes(rule.category_name.toLowerCase()) ||
            String(m.category || '').toLowerCase() === rule.badge_label.toLowerCase()
        )
        .sort((a, b) => Number(b.odometer_km || 0) - Number(a.odometer_km || 0))[0];

      const lastOdo = lastService ? Number(lastService.odometer_km || 0) : 0;
      const usedKm = Math.max(0, currentOdo - lastOdo);
      const remainingKm = Math.max(0, maxKm - usedKm);
      const pct = maxKm > 0 ? Math.min(100, Math.round((usedKm / maxKm) * 100)) : 0;
      const status = pct >= critPct ? 'critical' : pct >= warnPct ? 'warning' : 'ok';

      return {
        id: rule.id,
        categoryName: rule.category_name,
        badgeLabel: rule.badge_label,
        description: rule.description,
        usedKm,
        maxKm,
        remainingKm,
        pct,
        status,
      };
    })
    .sort((a, b) => b.pct - a.pct);
}
