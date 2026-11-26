/**
 * @typedef {Object} Vehicle
 * @property {string} id
 * @property {string} user_id
 * @property {string} name
 * @property {string} [plate_number]
 * @property {string} [brand_model]
 * @property {string} fuel_type
 * @property {number} tank_capacity_liters
 * @property {number} initial_odometer_km
 * @property {number} current_odometer_km
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * @typedef {Object} FuelLog
 * @property {string} id
 * @property {string} [user_id]
 * @property {string} vehicle_id
 * @property {string} logged_at
 * @property {number} odometer_km
 * @property {number} liters
 * @property {number} price_per_liter
 * @property {number} total_cost
 * @property {string} [fuel_brand]
 * @property {string} [station_name]
 * @property {boolean} is_full_tank
 * @property {string} [notes]
 * @property {string} [created_at]
 */

/**
 * @typedef {Object} MaintenanceLog
 * @property {string} id
 * @property {string} [user_id]
 * @property {string} vehicle_id
 * @property {string} logged_at
 * @property {number} odometer_km
 * @property {'oil_change'|'cvt_belt'|'tires'|'brakes'|'battery'|'tune_up'|'other'} category
 * @property {string} title
 * @property {string} [workshop_name]
 * @property {number} total_cost
 * @property {number|null} [next_due_km]
 * @property {string} [notes]
 * @property {string} [created_at]
 */

/**
 * @typedef {Object} FuelEfficiencyPoint
 * @property {string} id
 * @property {string} logged_at
 * @property {number} odometer_km
 * @property {number} distance_km
 * @property {number} liters
 * @property {number} km_per_liter
 * @property {number} cost_per_km
 * @property {number} total_cost
 */

/**
 * @typedef {Object} DashboardMetrics
 * @property {number} currentOdometerKm
 * @property {number} totalTrackedDistanceKm
 * @property {number|null} averageKmPerLiter
 * @property {number|null} lastKmPerLiter
 * @property {number} totalFuelCost
 * @property {number} totalFuelLiters
 * @property {number} totalMaintenanceCost
 * @property {number} totalOperatingCost
 * @property {number|null} costPerKm
 * @property {FuelEfficiencyPoint[]} efficiencySeries
 * @property {Array<{month: string, fuelCost: number, maintenanceCost: number, totalCost: number}>} monthlySpend
 * @property {Array<{title: string, category: string, nextDueKm: number, remainingKm: number, overdue: boolean}>} serviceReminders
 */

export {};
