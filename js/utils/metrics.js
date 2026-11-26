const DEFAULT_TANK_CAPACITY_LITERS = 3.7;

export function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function calculateFuelMetrics(fuelLogs = []) {
  const sorted = [...fuelLogs].sort((a, b) => {
    const odoDiff = toNumber(a.odometer_km) - toNumber(b.odometer_km);
    if (odoDiff !== 0) return odoDiff;
    return String(a.logged_at || "").localeCompare(String(b.logged_at || ""));
  });

  const totalFuelLiters = sorted.reduce((sum, item) => sum + Math.max(0, toNumber(item.liters)), 0);
  const totalFuelCost = sorted.reduce((sum, item) => sum + Math.max(0, toNumber(item.total_cost)), 0);

  let lastFullIndex = -1;
  let totalDistanceKm = 0;
  let totalConsumedLiters = 0;
  let latestEfficiencyKmPerLiter = null;

  for (let i = 0; i < sorted.length; i += 1) {
    const entry = sorted[i];
    const isFull = entry.is_full_tank !== false;

    if (isFull) {
      if (lastFullIndex !== -1) {
        const prev = sorted[lastFullIndex];
        const dist = toNumber(entry.odometer_km) - toNumber(prev.odometer_km);
        let litersBetween = 0;
        for (let j = lastFullIndex + 1; j <= i; j += 1) {
          litersBetween += Math.max(0, toNumber(sorted[j].liters));
        }

        if (dist > 0 && litersBetween > 0) {
          totalDistanceKm += dist;
          totalConsumedLiters += litersBetween;
          latestEfficiencyKmPerLiter = Number((dist / litersBetween).toFixed(2));
        }
      }
      lastFullIndex = i;
    }
  }

  const averageKmPerLiter =
    totalDistanceKm > 0 && totalConsumedLiters > 0
      ? Number((totalDistanceKm / totalConsumedLiters).toFixed(2))
      : null;

  return {
    averageKmPerLiter,
    totalFuelLiters: Number(totalFuelLiters.toFixed(2)),
    totalFuelCost: Math.round(totalFuelCost),
    latestEfficiencyKmPerLiter,
  };
}

export function calculateTankFillPercent(liters, tankCapacityLiters = DEFAULT_TANK_CAPACITY_LITERS) {
  const capacity = toNumber(tankCapacityLiters, DEFAULT_TANK_CAPACITY_LITERS);
  if (capacity <= 0) return 0;
  return Number(((Math.max(0, toNumber(liters)) / capacity) * 100).toFixed(1));
}

export function calculateVehicleSummary(vehicle, fuelLogs = [], maintenanceLogs = []) {
  const initialOdo = Math.max(0, toNumber(vehicle?.initial_odometer_km, 0));
  const fuelMetrics = calculateFuelMetrics(fuelLogs);
  const totalMaintenanceCost = Math.round(
    maintenanceLogs.reduce((sum, item) => sum + Math.max(0, toNumber(item.cost)), 0)
  );

  const maxFuelOdo = fuelLogs.reduce((max, item) => Math.max(max, toNumber(item.odometer_km)), initialOdo);
  const maxMaintOdo = maintenanceLogs.reduce(
    (max, item) => Math.max(max, toNumber(item.odometer_km)),
    initialOdo
  );
  const currentOdometerKm = Math.max(initialOdo, maxFuelOdo, maxMaintOdo);
  const distanceTrackedKm = Math.max(0, currentOdometerKm - initialOdo);

  const totalCost = fuelMetrics.totalFuelCost + totalMaintenanceCost;
  const costPerKm = distanceTrackedKm > 0 ? Number((totalCost / distanceTrackedKm).toFixed(2)) : null;

  return {
    currentOdometerKm,
    distanceTrackedKm,
    totalFuelLiters: fuelMetrics.totalFuelLiters,
    totalFuelCost: fuelMetrics.totalFuelCost,
    totalMaintenanceCost,
    totalCost,
    averageKmPerLiter: fuelMetrics.averageKmPerLiter,
    latestEfficiencyKmPerLiter: fuelMetrics.latestEfficiencyKmPerLiter,
    costPerKm,
    tankCapacityLiters: toNumber(vehicle?.tank_capacity_liters, DEFAULT_TANK_CAPACITY_LITERS),
  };
}

export function evaluateComponentStatus(component, currentOdometerKm) {
  const lastKm = Math.max(0, toNumber(component?.last_replaced_km, 0));
  const intervalKm = Math.max(1, toNumber(component?.interval_km, 2000));
  const currentKm = Math.max(0, toNumber(currentOdometerKm, 0));
  const usedKm = Math.max(0, currentKm - lastKm);
  const remainingKm = Math.round(intervalKm - usedKm);
  const nextDueKm = Math.round(lastKm + intervalKm);
  const wearPercent = Math.min(100, Number(((usedKm / intervalKm) * 100).toFixed(1)));

  let status = "OK";
  if (remainingKm <= 0) {
    status = "DUE";
  } else if (wearPercent >= 80) {
    status = "SOON";
  }

  return {
    usedKm,
    remainingKm,
    nextDueKm,
    wearPercent,
    status,
  };
}
