// public/js/controllers/dashboard-controller.js
import { getCurrentSession, signOut } from '../core/auth-service.js';
import { computeVehicleComponentStatus } from '../domain/fuel-analytics.js';
import {
  createFuelLog,
  createVehicleMaintenanceLog,
  deleteFuelLog,
  deleteVehicleMaintenanceLog,
  fetchVehicleDashboardSnapshot,
} from '../services/vehicle-service.js';

/**
 * @type {{
 *   userId: string,
 *   activeTab: 'fuel' | 'service' | 'components',
 *   vehicles: any[],
 *   selectedVehicleId: string,
 *   fuelLogs: any[],
 *   maintenanceLogs: any[],
 *   componentRules: any[]
 * }}
 */
const state = {
  userId: '',
  activeTab: 'fuel',
  vehicles: [],
  selectedVehicleId: '',
  fuelLogs: [],
  maintenanceLogs: [],
  componentRules: [],
};

/** @param {unknown} v */
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @param {number} n */
function idr(n) {
  return `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;
}

function getSelectedVehicle() {
  return (
    state.vehicles.find((v) => v.id === state.selectedVehicleId) ||
    state.vehicles[0] ||
    null
  );
}

function render() {
  const vehicle = getSelectedVehicle();
  const vehicleSelect = /** @type {HTMLSelectElement | null} */ (
    document.getElementById('vehicle-selector')
  );
  if (vehicleSelect) {
    vehicleSelect.innerHTML = state.vehicles
      .map(
        (v) =>
          `<option value="${esc(v.id)}" ${vehicle && v.id === vehicle.id ? 'selected' : ''}>${esc(v.name)}</option>`
      )
      .join('');
  }

  const vFuel = vehicle
    ? state.fuelLogs.filter((f) => f.vehicle_id === vehicle.id)
    : [];
  const vMaint = vehicle
    ? state.maintenanceLogs.filter((m) => m.vehicle_id === vehicle.id)
    : [];

  // KPI Summary
  const odoEl = document.getElementById('kpi-odometer');
  const kplEl = document.getElementById('kpi-kpl');
  const fuelSpendEl = document.getElementById('kpi-fuel-spend');
  const maintSpendEl = document.getElementById('kpi-maint-spend');

  const validKpl = vFuel
    .map((f) => Number(f.consumption_km_per_liter))
    .filter((n) => Number.isFinite(n) && n > 0);
  const avgKpl =
    validKpl.length > 0
      ? (validKpl.reduce((a, b) => a + b, 0) / validKpl.length).toFixed(1)
      : '0.0';

  const totalFuelCost = vFuel.reduce((s, f) => s + Number(f.total_cost || 0), 0);
  const totalMaintCost = vMaint.reduce((s, m) => s + Number(m.cost || 0), 0);

  if (odoEl) odoEl.textContent = `${Number(vehicle?.total_odometer_km || 0).toLocaleString('id-ID')} km`;
  if (kplEl) kplEl.textContent = `${avgKpl} km/L`;
  if (fuelSpendEl) fuelSpendEl.textContent = idr(totalFuelCost);
  if (maintSpendEl) maintSpendEl.textContent = idr(totalMaintCost);

  // Tab Navigation
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    const isCurrent = btn.getAttribute('data-tab') === state.activeTab;
    btn.className = `rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition ${
      isCurrent ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
    }`;
  });

  document.getElementById('panel-fuel')?.classList.toggle('hidden', state.activeTab !== 'fuel');
  document.getElementById('panel-service')?.classList.toggle('hidden', state.activeTab !== 'service');
  document.getElementById('panel-components')?.classList.toggle('hidden', state.activeTab !== 'components');

  // Render Fuel List
  const fuelListEl = document.getElementById('fuel-logs-list');
  if (fuelListEl) {
    if (vFuel.length === 0) {
      fuelListEl.innerHTML = `<p class="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">Belum ada catatan pengisian BBM.</p>`;
    } else {
      fuelListEl.innerHTML = vFuel
        .map(
          (f) => `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-white">${esc(f.fuel_type)} · ${Number(f.liters).toFixed(2)} L</span>
                ${
                  f.consumption_km_per_liter
                    ? `<span class="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">${Number(f.consumption_km_per_liter).toFixed(1)} km/L</span>`
                    : ''
                }
              </div>
              <p class="mt-1 text-xs text-slate-400">
                ${esc(f.date)} · Odo ${Number(f.odometer_km).toLocaleString('id-ID')} km ${f.station ? `· ${esc(f.station)}` : ''}
              </p>
            </div>
            <div class="flex items-center justify-between sm:justify-end gap-3">
              <span class="text-sm font-bold text-pink-400">${idr(f.total_cost)}</span>
              <button type="button" data-del-fuel="${esc(f.id)}" class="rounded-lg border border-rose-900/60 px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/60">Hapus</button>
            </div>
          </div>`
        )
        .join('');
    }
  }

  // Render Maintenance List
  const maintListEl = document.getElementById('maint-logs-list');
  if (maintListEl) {
    if (vMaint.length === 0) {
      maintListEl.innerHTML = `<p class="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">Belum ada catatan servis kendaraan.</p>`;
    } else {
      maintListEl.innerHTML = vMaint
        .map(
          (m) => `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-white">${esc(m.title)}</span>
                <span class="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">${esc(m.category)}</span>
              </div>
              <p class="mt-1 text-xs text-slate-400">
                ${esc(m.date)} · Odo ${Number(m.odometer_km).toLocaleString('id-ID')} km ${m.workshop ? `· ${esc(m.workshop)}` : ''}
              </p>
            </div>
            <div class="flex items-center justify-between sm:justify-end gap-3">
              <span class="text-sm font-bold text-pink-400">${idr(m.cost)}</span>
              <button type="button" data-del-maint="${esc(m.id)}" class="rounded-lg border border-rose-900/60 px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/60">Hapus</button>
            </div>
          </div>`
        )
        .join('');
    }
  }

  // Render Component Rules Wear Matrix
  const compTbody = document.getElementById('vehicle-components-tbody');
  if (compTbody) {
    const items = computeVehicleComponentStatus({
      currentOdometerKm: Number(vehicle?.total_odometer_km || 0),
      rules: state.componentRules,
      maintenanceLogs: vMaint,
    });

    compTbody.innerHTML = items
      .map((item) => {
        const badge =
          item.status === 'critical'
            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            : item.status === 'warning'
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
        const label =
          item.status === 'critical' ? 'Wajib Ganti' : item.status === 'warning' ? 'Perlu Cek' : 'Prima';

        return `
          <tr class="hover:bg-slate-900/60">
            <td class="px-4 py-3">
              <div class="font-medium text-white">${esc(item.categoryName)}</div>
              <div class="text-[11px] text-slate-400">${esc(item.description)}</div>
            </td>
            <td class="px-4 py-3 text-xs text-slate-200 whitespace-nowrap">
              ${item.usedKm.toLocaleString('id-ID')} / ${item.maxKm.toLocaleString('id-ID')} km
            </td>
            <td class="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">
              ${item.remainingKm.toLocaleString('id-ID')} km
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <span class="inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge}">
                ${label} · ${item.pct}%
              </span>
            </td>
          </tr>`;
      })
      .join('');
  }
}

async function reload() {
  const snap = await fetchVehicleDashboardSnapshot(state.userId);
  state.vehicles = snap.vehicles;
  if (!state.selectedVehicleId && state.vehicles[0]) {
    state.selectedVehicleId = state.vehicles[0].id;
  }
  state.fuelLogs = snap.fuelLogs;
  state.maintenanceLogs = snap.maintenanceLogs;
  state.componentRules = snap.componentRules;
  render();
}

async function init() {
  const session = await getCurrentSession();
  if (!session) {
    window.location.href = '/login';
    return;
  }
  state.userId = session.user.id;

  const today = new Date().toISOString().slice(0, 10);
  const fuelDate = /** @type {HTMLInputElement | null} */ (document.getElementById('fuel-date'));
  const maintDate = /** @type {HTMLInputElement | null} */ (document.getElementById('maint-date'));
  if (fuelDate) fuelDate.value = today;
  if (maintDate) maintDate.value = today;

  document.getElementById('btn-logout')?.addEventListener('click', () => signOut());

  document.getElementById('vehicle-selector')?.addEventListener('change', (e) => {
    state.selectedVehicleId = /** @type {HTMLSelectElement} */ (e.currentTarget).value;
    render();
  });

  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = /** @type {'fuel' | 'service' | 'components'} */ (btn.getAttribute('data-tab'));
      state.activeTab = tab;
      render();
    });
  });

  document.getElementById('form-fuel-log')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.currentTarget);
    const vehicle = getSelectedVehicle();
    if (!vehicle) return;

    const fd = new FormData(form);
    await createFuelLog(state.userId, {
      vehicleId: vehicle.id,
      date: String(fd.get('date') || today),
      odometerKm: Number(fd.get('odometerKm') || 0),
      liters: Number(fd.get('liters') || 0),
      pricePerLiter: Number(fd.get('pricePerLiter') || 0),
      fuelType: String(fd.get('fuelType') || 'Pertamax'),
      station: String(fd.get('station') || ''),
      isFullTank: fd.get('isFullTank') === 'on',
      notes: String(fd.get('notes') || ''),
    });
    form.reset();
    if (fuelDate) fuelDate.value = today;
    await reload();
  });

  document.getElementById('form-maint-log')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.currentTarget);
    const vehicle = getSelectedVehicle();
    if (!vehicle) return;

    const fd = new FormData(form);
    await createVehicleMaintenanceLog(state.userId, {
      vehicleId: vehicle.id,
      date: String(fd.get('date') || today),
      odometerKm: Number(fd.get('odometerKm') || 0),
      title: String(fd.get('title') || ''),
      category: String(fd.get('category') || 'Service'),
      cost: Number(fd.get('cost') || 0),
      workshop: String(fd.get('workshop') || ''),
      notes: String(fd.get('notes') || ''),
    });
    form.reset();
    if (maintDate) maintDate.value = today;
    await reload();
  });

  document.getElementById('fuel-logs-list')?.addEventListener('click', async (e) => {
    const id = /** @type {HTMLElement} */ (e.target).closest('[data-del-fuel]')?.getAttribute('data-del-fuel');
    if (id) {
      await deleteFuelLog(id);
      await reload();
    }
  });

  document.getElementById('maint-logs-list')?.addEventListener('click', async (e) => {
    const id = /** @type {HTMLElement} */ (e.target).closest('[data-del-maint]')?.getAttribute('data-del-maint');
    if (id) {
      await deleteVehicleMaintenanceLog(id);
      await reload();
    }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  await reload();
}

init();
