/**
 * @typedef {Object} Vehicle
 * @property {string} id
 * @property {string} user_id
 * @property {string} name
 * @property {string} [plate_number]
 * @property {string} [brand_model]
 * @property {string} [fuel_type]
 * @property {number} [tank_capacity_liters]
 * @property {number} [initial_odometer_km]
 * @property {string | null} [tax_due_date]
 * @property {string | null} [plate_due_date]
 * @property {string} [created_at]
 */

/**
 * @typedef {Object} FuelLog
 * @property {string} id
 * @property {string} user_id
 * @property {string} vehicle_id
 * @property {string} logged_at - YYYY-MM-DD
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
 * @property {string} user_id
 * @property {string} vehicle_id
 * @property {string} logged_at - YYYY-MM-DD
 * @property {number} odometer_km
 * @property {'oil_change'|'cvt_belt'|'tires'|'brakes'|'battery'|'tune_up'|'other'} category
 * @property {string} title
 * @property {string} [workshop_name]
 * @property {number} total_cost
 * @property {number | null} [next_due_km]
 * @property {string} [notes]
 * @property {string} [created_at]
 */

/**
 * @typedef {Object} FuelPriceOption
 * @property {string} [id]
 * @property {string} brand
 * @property {string} product_name
 * @property {number | null} [ron]
 * @property {number} price_per_liter
 * @property {number} [sort_order]
 * @property {boolean} [is_active]
 */

export {};