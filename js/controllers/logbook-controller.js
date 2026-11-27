import { requireAuth, signOut } from "../services/auth-service.js";
import {
  deleteFuelLog,
  deleteMaintenanceLog,
  listFuelLogs,
  listMaintenanceLogs,
  listVehicles
} from "../services/vehicle-service.js";
import {
  MAINTENANCE_CATEGORIES,
  formatDateID,
  formatIDR,
  formatLiters,
  formatNumber
} from "../utils/metrics.js";
import { escapeHtml, qs, showToast } from "../utils/dom.js";

const STORAGE_VEHICLE_KEY = "vehicle_logbook_active_vehicle_id";

const state = {
  /** @type {import("../types.js").Vehicle[]} */
  vehicles: [],
  activeVehicleId: "",
  /** @type {import("../types.js").FuelLog[]} */
  fuelLogs: [],
  /** @type {import("../types.js").MaintenanceLog[]} */
  maintenanceLogs: [],
  /** @type {"fuel" | "maint"} */
  activeTab: "fuel",
  searchQuery: ""
};

/**
 * @param {"fuel" | "maint"} tab
 */
function setTab(tab) {
  state.activeTab = tab;
  const tabFuel = qs("#tab-fuel");
  const tabMaint = qs("#tab-maint");
  const panelFuel = qs("#panel-fuel-logs");
  const panelMaint = qs("#panel-maint-logs");

  const isFuel = tab === "fuel";
  panelFuel?.classList.toggle("hidden", !isFuel);
  panelMaint?.classList.toggle("hidden", isFuel);

  if (tabFuel && tabMaint) {
    tabFuel.className = isFuel
      ? "rounded-lg bg-white px-3 py-1.5 text-slate-900 shadow-xs"
      : "rounded-lg px-3 py-1.5 text-slate-600 hover:text-slate-900";
    tabMaint.className = !isFuel
      ? "rounded-lg bg-white px-3 py-1.5 text-slate-900 shadow-xs"
      : "rounded-lg px-3 py-1.5 text-slate-600 hover:text-slate-900";
  }
}

function renderLists() {
  const query = state.searchQuery.trim().toLowerCase();

  const filteredFuel = state.fuelLogs.filter((f) => {
    if (!query) return true;
    const hay = `${f.fuel_brand || ""} ${f.station_name || ""} ${f.notes || ""} ${f.logged_at}`.toLowerCase();
    return hay.includes(query);
  });

  const filteredMaint = state.maintenanceLogs.filter((m) => {
    if (!query) return true;
    const catLabel = MAINTENANCE_CATEGORIES[m.category] || m.category;
    const hay = `${m.title || ""} ${catLabel} ${m.workshop_name || ""} ${m.notes || ""} ${m.logged_at}`.toLowerCase();
    return hay.includes(query);
  });

  const countFuel = qs("#count-fuel");
  const countMaint = qs("#count-maint");
  if (countFuel) countFuel.textContent = String(filteredFuel.length);
  if (countMaint) countMaint.textContent = String(filteredMaint.length);

  const fuelContainer = qs("#fuel-logs-list");
  if (fuelContainer) {
    if (!filteredFuel.length) {
      fuelContainer.innerHTML = `<p class="py-6 text-center text-sm text-slate-500">Tidak ada catatan BBM yang ditemukan.</p>`;
    } else {
      fuelContainer.innerHTML = filteredFuel
        .map(
          (f) => `
          <div class="flex items-center justify-between gap-3 py-3.5">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm font-bold text-slate-900">${escapeHtml(f.fuel_brand || "BBM")}</span>
                <span class="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                  ${formatLiters(f.liters)}
                </span>
                ${
                  f.is_full_tank
                    ? `<span class="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Full Tank</span>`
                    : ""
                }
              </div>
              <p class="mt-0.5 text-xs text-slate-500">
                ${escapeHtml(formatDateID(f.logged_at))} • ${formatNumber(f.odometer_km, 0)} km
                ${f.station_name ? ` • ${escapeHtml(f.station_name)}` : ""}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-slate-900">${escapeHtml(formatIDR(f.total_cost))}</span>
              <button
                type="button"
                data-delete-fuel="${escapeHtml(f.id)}"
                class="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                Hapus
              </button>
            </div>
          </div>
        `
        )
        .join("");
    }
  }

  const maintContainer = qs("#maint-logs-list");
  if (maintContainer) {
    if (!filteredMaint.length) {
      maintContainer.innerHTML = `<p class="py-6 text-center text-sm text-slate-500">Tidak ada catatan servis yang ditemukan.</p>`;
    } else {
      maintContainer.innerHTML = filteredMaint
        .map(
          (m) => `
          <div class="flex items-center justify-between gap-3 py-3.5">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm font-bold text-slate-900">${escapeHtml(m.title)}</span>
                <span class="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  ${escapeHtml(MAINTENANCE_CATEGORIES[m.category] || m.category)}
                </span>
              </div>
              <p class="mt-0.5 text-xs text-slate-500">
                ${escapeHtml(formatDateID(m.logged_at))} • ${formatNumber(m.odometer_km, 0)} km
                ${m.workshop_name ? ` • ${escapeHtml(m.workshop_name)}` : ""}
                ${m.next_due_km ? ` • Next: ${formatNumber(m.next_due_km, 0)} km` : ""}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-slate-900">${escapeHtml(formatIDR(m.total_cost))}</span>
              <button
                type="button"
                data-delete-maint="${escapeHtml(m.id)}"
                class="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                Hapus
              </button>
            </div>
          </div>
        `
        )
        .join("");
    }
  }
}

async function loadLogs() {
  if (!state.activeVehicleId) {
    state.fuelLogs = [];
    state.maintenanceLogs = [];
    renderLists();
    return;
  }

  localStorage.setItem(STORAGE_VEHICLE_KEY, state.activeVehicleId);
  const [fuelLogs, maintenanceLogs] = await Promise.all([
    listFuelLogs(state.activeVehicleId),
    listMaintenanceLogs(state.activeVehicleId)
  ]);

  state.fuelLogs = fuelLogs;
  state.maintenanceLogs = maintenanceLogs;
  renderLists();
}

function bindEvents() {
  qs("#btn-signout")?.addEventListener("click", async () => {
    await signOut("./login.html");
  });

  qs("#tab-fuel")?.addEventListener("click", () => setTab("fuel"));
  qs("#tab-maint")?.addEventListener("click", () => setTab("maint"));

  qs("#logs-vehicle-selector")?.addEventListener("change", async (event) => {
    const select = /** @type {HTMLSelectElement} */ (event.target);
    state.activeVehicleId = select.value;
    await loadLogs();
  });

  qs("#logs-search")?.addEventListener("input", (event) => {
    const input = /** @type {HTMLInputElement} */ (event.target);
    state.searchQuery = input.value;
    renderLists();
  });

  qs("#fuel-logs-list")?.addEventListener("click", async (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    const id = target.getAttribute("data-delete-fuel");
    if (!id) return;

    if (!window.confirm("Hapus catatan pengisian BBM ini?")) return;
    try {
      await deleteFuelLog(id);
      await loadLogs();
      showToast("Catatan BBM dihapus.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menghapus catatan BBM.", "error");
    }
  });

  qs("#maint-logs-list")?.addEventListener("click", async (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    const id = target.getAttribute("data-delete-maint");
    if (!id) return;

    if (!window.confirm("Hapus catatan servis ini?")) return;
    try {
      await deleteMaintenanceLog(id);
      await loadLogs();
      showToast("Catatan servis dihapus.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menghapus catatan servis.", "error");
    }
  });
}

async function initLogsPage() {
  try {
    const user = await requireAuth("./login.html");
    const userEmailEl = qs("#user-email");
    if (userEmailEl) userEmailEl.textContent = user.email || "";

    bindEvents();

    state.vehicles = await listVehicles();
    const select = /** @type {HTMLSelectElement | null} */ (qs("#logs-vehicle-selector"));

    if (!state.vehicles.length) {
      if (select) select.innerHTML = `<option value="">Belum ada kendaraan</option>`;
      renderLists();
      return;
    }

    const savedId = localStorage.getItem(STORAGE_VEHICLE_KEY) || "";
    state.activeVehicleId =
      savedId && state.vehicles.some((v) => v.id === savedId) ? savedId : state.vehicles[0].id;

    if (select) {
      select.innerHTML = state.vehicles
        .map((v) => {
          const label = v.plate_number ? `${v.name} (${v.plate_number})` : v.name;
          const selected = v.id === state.activeVehicleId ? "selected" : "";
          return `<option value="${escapeHtml(v.id)}" ${selected}>${escapeHtml(label)}</option>`;
        })
        .join("");
    }

    await loadLogs();
  } catch (err) {
    if (err instanceof Error && err.message === "AUTH_REDIRECT") return;
    showToast(err instanceof Error ? err.message : "Gagal memuat riwayat log.", "error");
  }
}

document.addEventListener("DOMContentLoaded", initLogsPage);