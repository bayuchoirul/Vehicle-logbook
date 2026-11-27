import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateFuelEfficiencySeries,
  calculateLitersFromCost,
  detectOdometerAnomaly,
  formatLiters,
  summarizeMonthlySpend,
  summarizeServiceReminders,
  summarizeTaxReminders,
  summarizeVehicleTelemetry
} from "../js/utils/metrics.js";

test("calculateLitersFromCost derives exact liters from total rupiah and unit price", () => {
  assert.equal(calculateLitersFromCost(22000, 12100), 1.818);
  assert.equal(calculateLitersFromCost(30000, 10000), 3);
  assert.equal(calculateLitersFromCost(0, 12100), 0);
  assert.equal(calculateLitersFromCost(20000, 0), 0);
  assert.equal(formatLiters(1.818), "1,82 L");
});

test("calculateFuelEfficiencySeries computes km/L across full-tank cycles and accumulates partial fills", () => {
  const logs = [
    { id: "1", logged_at: "2026-11-01", odometer_km: 10000, liters: 3.1, total_cost: 37510, is_full_tank: true },
    { id: "2", logged_at: "2026-11-05", odometer_km: 10080, liters: 1.5, total_cost: 18150, is_full_tank: false },
    { id: "3", logged_at: "2026-11-10", odometer_km: 10180, liters: 2.5, total_cost: 30250, is_full_tank: true }
  ];

  const series = calculateFuelEfficiencySeries(logs);
  assert.equal(series.length, 1);
  assert.equal(series[0].distance_km, 180);
  assert.equal(series[0].liters_used, 4);
  assert.equal(series[0].km_per_liter, 45);
});

test("summarizeVehicleTelemetry computes odometer, spend totals, and cost per km", () => {
  const vehicle = { id: "v-1", user_id: "u-1", name: "Honda Vario 110 eSP", initial_odometer_km: 528000 };
  const fuelLogs = [
    { id: "f-1", logged_at: "2026-11-01", odometer_km: 528200, liters: 3.2, total_cost: 38720, is_full_tank: true },
    { id: "f-2", logged_at: "2026-11-08", odometer_km: 528408, liters: 3.3, total_cost: 39930, is_full_tank: true }
  ];
  const maintLogs = [
    { id: "m-1", logged_at: "2026-11-09", odometer_km: 528408, category: "oil_change", title: "Oli MPX2", total_cost: 65000, next_due_km: 530408 }
  ];

  const summary = summarizeVehicleTelemetry(vehicle, fuelLogs, maintLogs);
  assert.equal(summary.currentOdometer, 528408);
  assert.equal(summary.trackedDistance, 408);
  assert.equal(summary.totalFuelCost, 78650);
  assert.equal(summary.totalMaintenanceCost, 65000);
  assert.equal(summary.totalSpend, 143650);
  assert.equal(summary.avgKmPerLiter, 63.03);
  assert.equal(summary.costPerKm, 352);
});

test("summarizeServiceReminders flags due and overdue components based on latest log per category", () => {
  const maintLogs = [
    { id: "1", logged_at: "2026-09-01", odometer_km: 10000, category: "oil_change", title: "Oli Lama", total_cost: 60000, next_due_km: 12000 },
    { id: "2", logged_at: "2026-10-01", odometer_km: 12000, category: "oil_change", title: "Oli Baru", total_cost: 60000, next_due_km: 14000 },
    { id: "3", logged_at: "2026-08-01", odometer_km: 8000, category: "cvt_belt", title: "Servis CVT", total_cost: 150000, next_due_km: 13500 }
  ];

  const reminders = summarizeServiceReminders(maintLogs, 13700, 500);
  assert.equal(reminders.length, 2);
  assert.equal(reminders[0].category, "cvt_belt");
  assert.equal(reminders[0].overdue, true);
  assert.equal(reminders[0].remainingKm, -200);
  assert.equal(reminders[1].category, "oil_change");
  assert.equal(reminders[1].overdue, false);
  assert.equal(reminders[1].remainingKm, 300);
});

test("summarizeMonthlySpend creates N chronological monthly buckets", () => {
  const buckets = summarizeMonthlySpend([], [], 6);
  assert.equal(buckets.length, 6);
  assert.equal(buckets[5].total, 0);
});

test("detectOdometerAnomaly flags lower odometer than earlier log and normalizes valid order", () => {
  const existingLogs = [
    { id: "a", logged_at: "2026-11-01", odometer_km: 528000 },
    { id: "b", logged_at: "2026-11-10", odometer_km: 528408 }
  ];

  assert.equal(detectOdometerAnomaly(existingLogs, 528500, "2026-11-15"), null);
  assert.ok(
    String(detectOdometerAnomaly(existingLogs, 527900, "2026-11-15")).includes("lebih kecil")
  );
  assert.equal(detectOdometerAnomaly(existingLogs, 528408, "2026-11-10", "b"), null);
});

test("summarizeTaxReminders calculates countdowns, urgency, and overdue states", () => {
  const vehicle = {
    id: "v-1",
    user_id: "u-1",
    name: "Honda Vario 110 eSP",
    tax_due_date: "2026-12-10",
    plate_due_date: "2026-11-20"
  };

  const reminders = summarizeTaxReminders(vehicle, "2026-11-27");
  assert.equal(reminders.length, 2);
  assert.equal(reminders[0].kind, "plate");
  assert.equal(reminders[0].daysRemaining, -7);
  assert.equal(reminders[0].overdue, true);
  assert.equal(reminders[1].kind, "tax");
  assert.equal(reminders[1].daysRemaining, 13);
  assert.equal(reminders[1].urgent, true);
});