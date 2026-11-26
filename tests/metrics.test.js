import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  toNumber,
  calculateFuelMetrics,
  calculateTankFillPercent,
  calculateVehicleSummary,
  evaluateComponentStatus,
} from "../js/utils/metrics.js";

describe("js/utils/metrics.js", () => {
  it("converts numeric values safely", () => {
    assert.equal(toNumber("42.5"), 42.5);
    assert.equal(toNumber("invalid", 3.7), 3.7);
  });

  it("calculates fuel efficiency (km/L) across full-tank intervals", () => {
    const logs = [
      { vehicle_id: "v1", logged_at: "2026-10-01", odometer_km: 1000, liters: 3.0, total_cost: 39000, is_full_tank: true },
      { vehicle_id: "v1", logged_at: "2026-10-08", odometer_km: 1140, liters: 2.8, total_cost: 36400, is_full_tank: true },
    ];
    const result = calculateFuelMetrics(logs);
    assert.equal(result.averageKmPerLiter, 50);
    assert.equal(result.totalFuelCost, 75400);
  });

  it("computes tank fill percentage against Honda Vario 110 eSP 3.7 L", () => {
    assert.equal(calculateTankFillPercent(1.85), 50);
  });

  it("evaluates component wear status accurately", () => {
    const comp = { last_replaced_km: 24000, interval_km: 2000 };
    assert.equal(evaluateComponentStatus(comp, 24500).remainingKm, 1500);
    assert.equal(evaluateComponentStatus(comp, 24500).status, "OK");
    assert.equal(evaluateComponentStatus(comp, 25700).status, "SOON");
    assert.equal(evaluateComponentStatus(comp, 26100).status, "DUE");
  });
});
