import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateFuelEfficiencySeries,
  calculateLitersFromCost,
  summarizeVehicleMetrics
} from "../js/utils/metrics.js";

test("calculateLitersFromCost computes accurate liters from transaction cost and price per liter", () => {
  assert.equal(calculateLitersFromCost(35000, 12100), 2.893);
  assert.equal(calculateLitersFromCost(36300, 12100), 3);
  assert.equal(calculateLitersFromCost(0, 12100), 0);
  assert.equal(calculateLitersFromCost(35000, 0), 0);
});

test("calculateFuelEfficiencySeries computes accurate full-to-full km/L and Rp/km", () => {
  const logs = [
    {
      id: "1",
      vehicle_id: "v1",
      logged_at: "2026-11-01",
      odometer_km: 10000,
      liters: 3.1,
      price_per_liter: 12100,
      total_cost: 37510,
      is_full_tank: true
    },
    {
      id: "2",
      vehicle_id: "v1",
      logged_at: "2026-11-10",
      odometer_km: 10150,
      liters: 3.0,
      price_per_liter: 12100,
      total_cost: 36300,
      is_full_tank: true
    }
  ];

  const series = calculateFuelEfficiencySeries(logs);
  assert.equal(series.length, 1);
  assert.equal(series[0].distance_km, 150);
  assert.equal(series[0].km_per_liter, 50);
  assert.equal(series[0].cost_per_km, 242);
});

test("calculateFuelEfficiencySeries accumulates partial fill-ups until next full tank", () => {
  const logs = [
    {
      id: "1",
      vehicle_id: "v1",
      logged_at: "2026-11-01",
      odometer_km: 20000,
      liters: 3.0,
      price_per_liter: 12100,
      total_cost: 36300,
      is_full_tank: true
    },
    {
      id: "2",
      vehicle_id: "v1",
      logged_at: "2026-11-05",
      odometer_km: 20080,
      liters: 1.5,
      price_per_liter: 12100,
      total_cost: 18150,
      is_full_tank: false
    },
    {
      id: "3",
      vehicle_id: "v1",
      logged_at: "2026-11-12",
      odometer_km: 20200,
      liters: 2.5,
      price_per_liter: 12100,
      total_cost: 30250,
      is_full_tank: true
    }
  ];

  const series = calculateFuelEfficiencySeries(logs);
  assert.equal(series.length, 1);
  assert.equal(series[0].distance_km, 200);
  assert.equal(series[0].liters, 4);
  assert.equal(series[0].km_per_liter, 50);
});

test("summarizeVehicleMetrics aggregates operating costs and overdue service alerts", () => {
  const vehicle = {
    id: "v1",
    user_id: "u1",
    name: "Honda Vario 110 eSP",
    fuel_type: "Pertamax",
    tank_capacity_liters: 3.7,
    initial_odometer_km: 15000,
    current_odometer_km: 15500
  };

  const fuelLogs = [
    {
      id: "f1",
      vehicle_id: "v1",
      logged_at: "2026-11-01",
      odometer_km: 15000,
      liters: 3.0,
      price_per_liter: 12100,
      total_cost: 36300,
      is_full_tank: true
    },
    {
      id: "f2",
      vehicle_id: "v1",
      logged_at: "2026-11-15",
      odometer_km: 15500,
      liters: 10.0,
      price_per_liter: 12100,
      total_cost: 121000,
      is_full_tank: true
    }
  ];

  const maintenanceLogs = [
    {
      id: "m1",
      vehicle_id: "v1",
      logged_at: "2026-11-05",
      odometer_km: 15100,
      category: "oil_change",
      title: "Ganti Oli MPX2",
      total_cost: 65000,
      next_due_km: 15400
    }
  ];

  const summary = summarizeVehicleMetrics(vehicle, fuelLogs, maintenanceLogs);
  assert.equal(summary.currentOdometerKm, 15500);
  assert.equal(summary.totalTrackedDistanceKm, 500);
  assert.equal(summary.averageKmPerLiter, 50);
  assert.equal(summary.totalOperatingCost, 222300);
  assert.equal(summary.serviceReminders.length, 1);
  assert.equal(summary.serviceReminders[0].overdue, true);
  assert.equal(summary.serviceReminders[0].remainingKm, -100);
});