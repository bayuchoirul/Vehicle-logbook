import { DEFAULT_TOKEN, DEFAULT_MOTORS, DEFAULT_MASTER } from "./presets.js";

const loadedMotors = JSON.parse(localStorage.getItem("veh_motors") || JSON.stringify(DEFAULT_MOTORS));
const loadedLogs = JSON.parse(localStorage.getItem("veh_logs") || localStorage.getItem("vario_logs") || "[]");
const loadedMaster = JSON.parse(localStorage.getItem("veh_master") || JSON.stringify(DEFAULT_MASTER));

export const state = {
  motors: loadedMotors,
  logs: loadedLogs.map((l) => ({ ...l, motor_id: l.motor_id || "MTR-01" })),
  master: loadedMaster.map((m) => ({ ...m, motor_id: m.motor_id || "MTR-01" })),
  activeMotorId: localStorage.getItem("veh_active_motor") || "MTR-01",
  filter: "ALL",
  formMode: "Servis",
  currentTab: "dashboard"
};

export function getConfig() {
  return {
    url: localStorage.getItem("vario_gas_url") || "",
    token: localStorage.getItem("vario_gas_token") || DEFAULT_TOKEN,
    pertamaxPrice: Number(localStorage.getItem("vario_pertamax_price") || localStorage.getItem("vario_fuel_price") || 12100),
    pertalitePrice: Number(localStorage.getItem("vario_pertalite_price") || 10000),
    ownerName: localStorage.getItem("veh_owner_name") || "Bayu Choirul Imam"
  };
}

export function persistLocal() {
  localStorage.setItem("veh_motors", JSON.stringify(state.motors));
  localStorage.setItem("veh_logs", JSON.stringify(state.logs));
  localStorage.setItem("veh_master", JSON.stringify(state.master));
  localStorage.setItem("veh_active_motor", state.activeMotorId);
}

export function getActiveMotor() {
  return state.motors.find((m) => m.motor_id === state.activeMotorId) || state.motors[0] || DEFAULT_MOTORS[0];
}

export function getActiveLogs() {
  const m = getActiveMotor();
  return state.logs.filter((l) => (l.motor_id || "MTR-01") === m.motor_id);
}

export function getActiveMaster() {
  const m = getActiveMotor();
  return state.master.filter((c) => (c.motor_id || "MTR-01") === m.motor_id);
}

export function getLatestOdometer(motorId = null) {
  const targetId = motorId || getActiveMotor().motor_id;
  const mLogs = state.logs.filter((l) => (l.motor_id || "MTR-01") === targetId);
  if (mLogs.length === 0) return 0;
  return Math.max(...mLogs.map((l) => Number(l.odometer) || 0));
}

export function monthsBetween(dateStr) {
  if (!dateStr) return 0;
  const start = new Date(dateStr);
  const now = new Date();
  const diffDays = (now - start) / (1000 * 60 * 60 * 24);
  return Math.max(0, diffDays / 30.44);
}

export function calculateFuelEfficiency() {
  const fuelLogs = getActiveLogs()
    .filter((l) => l.kategori === "Bensin" && Number(l.liter) > 0)
    .sort((a, b) => Number(a.odometer) - Number(b.odometer));

  const fullIndexes = [];
  fuelLogs.forEach((log, idx) => {
    if (log.full_tank === true || log.full_tank === "TRUE") fullIndexes.push(idx);
  });

  if (fullIndexes.length < 2) return null;

  const prevFullIdx = fullIndexes[fullIndexes.length - 2];
  const lastFullIdx = fullIndexes[fullIndexes.length - 1];

  const distance = Number(fuelLogs[lastFullIdx].odometer) - Number(fuelLogs[prevFullIdx].odometer);
  if (distance <= 0) return null;

  let totalLiters = 0;
  for (let i = prevFullIdx + 1; i <= lastFullIdx; i++) {
    totalLiters += Number(fuelLogs[i].liter);
  }

  return totalLiters > 0 ? (distance / totalLiters).toFixed(1) : null;
}

export function computeComponentStatuses() {
  const mLogs = getActiveLogs();
  const mMaster = getActiveMaster();
  const latestOdo = getLatestOdometer();

  return mMaster.map((comp) => {
    const matchingLogs = mLogs
      .filter((l) => String(l.item).toLowerCase() === String(comp.nama_komponen).toLowerCase())
      .sort((a, b) => Number(b.odometer) - Number(a.odometer));

    if (matchingLogs.length === 0) {
      return {
        ...comp,
        hasHistory: false,
        effectivePct: 0,
        statusLevel: "empty"
      };
    }

    const lastLog = matchingLogs[0];
    const lastReplacedOdo = Number(lastLog.odometer);
    const usedKm = Math.max(0, latestOdo - lastReplacedOdo);
    const intervalKm = Number(comp.interval_km) || 1;
    const pctKm = (usedKm / intervalKm) * 100;

    const usedMonths = monthsBetween(lastLog.tanggal);
    const intervalMonths = Number(comp.interval_bulan) || 0;
    const pctMonths = intervalMonths > 0 ? (usedMonths / intervalMonths) * 100 : 0;

    const effectivePct = Math.min(100, Math.round(Math.max(pctKm, pctMonths)));
    const remainingKm = intervalKm - usedKm;

    let statusLevel = "ok";
    if (effectivePct >= 95) statusLevel = "danger";
    else if (effectivePct >= 75) statusLevel = "warn";

    return {
      ...comp,
      hasHistory: true,
      lastLog,
      lastReplacedOdo,
      usedKm,
      intervalKm,
      remainingKm,
      usedMonths,
      intervalMonths,
      effectivePct,
      statusLevel
    };
  });
}

export const formatRp = (num) => "Rp " + Number(num || 0).toLocaleString("id-ID");
export const formatKm = (num) => Number(num || 0).toLocaleString("id-ID") + " km";
