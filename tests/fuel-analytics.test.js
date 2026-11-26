// tests/fuel-analytics.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFuelEfficiency } from '../public/js/domain/fuel-analytics.js';

test('calculateFuelEfficiency menghitung trip distance dan km/L dengan akurat', () => {
  const res = calculateFuelEfficiency(
    { odometerKm: 10150, liters: 3.0, isFullTank: true },
    { odometerKm: 10000, isFullTank: true }
  );
  assert.equal(res.tripDistanceKm, 150);
  assert.equal(res.kmPerLiter, 50);
});
