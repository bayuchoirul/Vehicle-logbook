import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateFuelEfficiencySeries,
  calculateLitersFromCost,
  calculateNextTaxDueDate,
  detectOdometerAnomaly,
  summarizeFuelBrandBreakdown,
  summarizeServiceReminders,
  summarizeTaxReminders,
  summarizeVehicleTelemetry
} from "../js/utils/metrics.js";

test("calculateLitersFromCost rounds to 3 decimals", () => {
  assert.equal(calculateLitersFromCost(35000, 12100), 2.893);
  assert.equal(calculateLitersFromCost(0, 12100), 0);
});

test("calculateFuelEfficiencySeries accumulates partial fills until closing full tank", () => {
  const series = calculateFuelEfficiencySeries([
    { id: "1", vehicle_id: "v1", logged_at: "2026-11-01", odometer_km: 1000, liters: 3.0, price_per_liter: 12100, total_cost: 36300, is_full_tank: true },
    { id: "2", vehicle_id: "v1", logged_at: "2026-11-05", odometer_km: 1060, liters: 1.0, price_per_liter: 12100, total_cost: 12100, is_full_tank: false },
    { id: "3", vehicle_id: "v1", logged_at: "2026-11-10", odometer_km: 1150, liters: 2.0, price_per_liter: 12100, total_cost: 24200, is_full_tank: true }
  ]);

  assert.equal(series.length, 1);
  assert.equal(series[0].distance_km, 150);
  assert.equal(series[0].liters_used, 3);
  assert.equal(series[0].km_per_liter, 50);
});

test("summarizeVehicleTelemetry & summarizeFuelBrandBreakdown aggregate totals", () => {
  const vehicle = { id: "v1", name: "Vario 110", initial_odometer_km: 10000 };
  const fuels = [
    { id: "f1", vehicle_id: "v1", logged_at: "2026-11-01", odometer_km: 10100, liters: 2.5, price_per_liter: 12100, total_cost: 30250, fuel_brand: "Pertamax", is_full_tank: true },
    { id: "f2", vehicle_id: "v1", logged_at: "2026-11-08", odometer_km: 10225, liters: 2.5, price_per_liter: 12100, total_cost: 30250, fuel_brand: "Pertamax", is_full_tank: true }
  ];
  const maints = [
    { id: "m1", vehicle_id: "v1", logged_at: "2026-11-09", odometer_km: 10225, category: "oil_change", title: "Ganti Oli", total_cost: 65000, next_due_km: 12225 }
  ];

  const tel = summarizeVehicleTelemetry(vehicle, fuels, maints);
  assert.equal(tel.currentOdometer, 10225);
  assert.equal(tel.trackedDistance, 225);
  assert.equal(tel.avgKmPerLiter, 50);
  assert.equal(tel.totalSpend, 125500);

  const brands = summarizeFuelBrandBreakdown(fuels);
  assert.equal(brands.length, 1);
  assert.equal(brands[0].brand, "Pertamax");
  assert.equal(brands[0].fillCount, 2);

  const reminders = summarizeServiceReminders(maints, 11800, 500);
  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].remainingKm, 425);
});

test("summarizeTaxReminders visibility windows, calculateNextTaxDueDate & detectOdometerAnomaly", () => {
  const beforeH7 = summarizeTaxReminders(
    { id: "v1", name: "Vario", tax_due_date: "2026-12-10", plate_due_date: "2027-03-04" },
    "2026-11-27"
  );
  assert.equal(beforeH7[0].kind, "tax");
  assert.equal(beforeH7[0].daysRemaining, 13);
  assert.equal(beforeH7[0].canPay, true);

  assert.equal(beforeH7[1].kind, "plate");
  assert.equal(beforeH7[1].daysRemaining, 97);
  assert.equal(beforeH7[1].canPay, false);

  const atH7 = summarizeTaxReminders(
    { id: "v1", name: "Vario", tax_due_date: "2027-03-04", plate_due_date: "2027-03-04" },
    "2027-02-25"
  );
  assert.equal(atH7[0].canPay, true);
  assert.equal(atH7[1].canPay, true);

  assert.equal(calculateNextTaxDueDate("2026-12-10", "tax"), "2027-12-10");
  assert.equal(calculateNextTaxDueDate("2026-12-10", "plate"), "2031-12-10");
  assert.equal(calculateNextTaxDueDate("2024-02-29", "tax"), "2025-02-28");

  const warning = detectOdometerAnomaly(
    [{ id: "f1", logged_at: "2026-11-10", odometer_km: 10500 }],
    10400,
    "2026-11-12"
  );
  assert.ok(warning && warning.includes("lebih kecil"));
});