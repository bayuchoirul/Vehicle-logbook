import { requireAuth, signOut } from "../services/auth-service.js";
import {
  DEFAULT_FUEL_PRICES,
  createFuelLog,
  createMaintenanceLog,
  createVehicle,
  listFuelLogs,
  listFuelPrices,
  listMaintenanceLogs,
  listVehicles
} from "../services/vehicle-service.js";
import {
  MAINTENANCE_CATEGORIES,
  calculateLitersFromCost,
  formatDateID,
  formatIDR,
  formatLiters,
  formatNumber,
  summarizeVehicleMetrics
} from "../utils/metrics.js";
import {
  bindModalDismissHandlers,
  closeModal,
  escapeHtml,
  openModal,
  qs,
  setButtonLoading,
  setModalError,
  showToast
} from "../utils/dom.js";

const STORAGE_VEHICLE_KEY = "vehicle_logbook_active_vehicle_id";

const state = {
  /** @type {import("../types.js").Vehicle[]} */
  vehicles: [],
  /** @type {string} */
  activeVehicleId: "",
  /** @type {import("../types.js").FuelPriceOption[]} */
  fuelPrices: [...DEFAULT_FUEL_PRICES],
  /** @type {import("../types.js").FuelLog[]} */
  fuelLogs: [],
  /** @type {import("../types.js").MaintenanceLog[]} */
  maintenanceLogs: []
};

/**
 * Returns currently selected vehicle object.
 * @returns {import("../types.js").Vehicle | null}
 */
function getActiveVehicle() {
  return state.vehicles.find((v) => v.id === state.activeVehicleId) || state.vehicles[0] || null;
}

/**
 * Finds a fuel price entry by product name (case-insensitive).
 * @param {string} productName
 * @returns {import("../types.js").FuelPriceOption | undefined}
 */
function findFuelOption(productName) {
  const needle = String(productName || "").trim().toLowerCase();
  return state.fuelPrices.find((item) => item.product_name.toLowerCase() === needle);
}

/**
 * Populates a <select> element with grouped <optgroup> Indonesian fuel products.
 * @param {HTMLSelectElement | null} selectEl
 * @param {string} [selectedProductName="Pertamax"]
 */
function renderFuelSelectOptions(selectEl, selectedProductName = "Pertamax") {
  if (!selectEl) return;

  /** @type {Map<string, import("../types.js").FuelPriceOption[]>} */
  const grouped = new Map();
  for (const item of state.fuelPrices) {
    const list = grouped.get(item.brand) || [];
    list.push(item);
    grouped.set(item.brand, list);
  }

  const targetLower = String(selectedProductName || "Pertamax").trim().toLowerCase();
  let matched = false;

  const groupsHtml = [...grouped.entries()]
    .map(([brand, items]) => {
      const optionsHtml = items
        .map((item) => {
          const isSelected = item.product_name.toLowerCase() === targetLower;
          if (isSelected) matched = true;
          const specText = item.spec_label ? ` (${item.spec_label})` : "";
          const label = `${item.product_name}${specText} — ${formatIDR(item.price_per_liter)}/L`;
          return `<option value="${escapeHtml(item.product_name)}" data-price="${
            item.price_per_liter
          }" ${isSelected ? "selected" : ""}>${escapeHtml(label)}</option>`;
        })
        .join("");
      return `<optgroup label="${escapeHtml(brand)}">${optionsHtml}</optgroup>`;
    })
    .join("");

  if (!matched && selectedProductName) {
    const customOpt = `<option value="${escapeHtml(selectedProductName)}" selected>${escapeHtml(
      selectedProductName
    )}</option>`;
    selectEl.innerHTML = customOpt + groupsHtml;
  } else {
    selectEl.innerHTML = groupsHtml;
  }
}

/**
 * Synchronizes `#fuel-price` from the currently selected `#fuel-brand` option and refreshes liter preview.
 */
function syncFuelPriceFromSelection() {
  const brandSelect = /** @type {HTMLSelectElement | null} */ (qs("#fuel-brand"));
  const priceInput = /** @type {HTMLInputElement | null} */ (qs("#fuel-price"));
  if (!brandSelect || !priceInput) return;

  const selectedOption = brandSelect.options[brandSelect.selectedIndex];
  const datasetPrice = Number(selectedOption?.dataset?.price || 0);
  if (datasetPrice > 0) {
    priceInput.value = String(datasetPrice);
  } else {
    const found = findFuelOption(brandSelect.value);
    if (found) priceInput.value = String(found.price_per_liter);
  }
  updateCalculatedLitersPreview();
}

/**
 * Computes and displays estimated liters from `Total Bayar (Rp) / Harga per Liter (Rp)`.
 */
function updateCalculatedLitersPreview() {
  const totalInput = /** @type {HTMLInputElement | null} */ (qs("#fuel-total"));
  const priceInput = /** @type {HTMLInputElement | null} */ (qs("#fuel-price"));
  const previewEl = qs("#fuel-liters-preview");
  if (!previewEl) return;

  const totalCost = Number(String(totalInput?.value || "").replace(",", "."));
  const pricePerLiter = Number(String(priceInput?.value || "").replace(",", "."));
  const liters = calculateLitersFromCost(totalCost, pricePerLiter);

  if (liters > 0) {
    previewEl.textContent = formatLiters(liters);
    previewEl.classList.remove("text-slate-400");
    previewEl.classList.add("text-sky-700");
  } else {
    previewEl.textContent = "0,00 L";
    previewEl.classList.add("text-slate-400");
    previewEl.classList.remove("text-sky-700");
  }
}

function renderVehicleSelector() {
  const select = /** @type {HTMLSelectElement | null} */ (qs("#vehicle-selector"));
  const emptyBanner = qs("#empty-vehicle-banner");
  const dashboardContent = qs("#dashboard-main");

  if (!select) return;

  if (state.vehicles.length === 0) {
    select.innerHTML = `<option value="">Belum ada kendaraan</option>`;
    emptyBanner?.classList.remove("hidden");
    dashboardContent?.classList.add("opacity-50", "pointer-events-none");
    return;
  }

  emptyBanner?.classList.add("hidden");
  dashboardContent?.classList.remove("opacity-50", "pointer-events-none");

  select.innerHTML = state.vehicles
    .map((v) => {
      const label = v.plate_number ? `${v.name} (${v.plate_number})` : v.name;
      const selected = v.id === state.activeVehicleId ? "selected" : "";
      return `<option value="${escapeHtml(v.id)}" ${selected}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function renderDashboard() {
  const vehicle = getActiveVehicle();
  const metrics = summarizeVehicleMetrics(vehicle, state.fuelLogs, state.maintenanceLogs);

  const badgeEl = qs("#vehicle-meta-badge");
  if (badgeEl) {
    badgeEl.textContent = vehicle
      ? `${vehicle.fuel_type} • Tangki ${formatNumber(vehicle.tank_capacity_liters, 1)} L`
      : "Belum ada kendaraan";
  }

  const odoEl = qs("#kpi-odometer");
  const distEl = qs("#kpi-distance");
  const avgKmplEl = qs("#kpi-avg-kmpl");
  const lastKmplEl = qs("#kpi-last-kmpl");
  const totalCostEl = qs("#kpi-total-cost");
  const costPerKmEl = qs("#kpi-cost-per-km");
  const fuelCostEl = qs("#kpi-fuel-cost");
  const maintCostEl = qs("#kpi-maint-cost");

  if (odoEl) odoEl.textContent = `${formatNumber(metrics.currentOdometerKm, 0)} km`;
  if (distEl) distEl.textContent = `Jarak tercatat: ${formatNumber(metrics.totalTrackedDistanceKm, 1)} km`;
  if (avgKmplEl) {
    avgKmplEl.textContent =
      metrics.averageKmPerLiter !== null ? `${formatNumber(metrics.averageKmPerLiter, 2)} km/L` : "— km/L";
  }
  if (lastKmplEl) {
    lastKmplEl.textContent =
      metrics.lastKmPerLiter !== null
        ? `Isian terakhir: ${formatNumber(metrics.lastKmPerLiter, 2)} km/L`
        : "Butuh min. 2x full tank";
  }
  if (totalCostEl) totalCostEl.textContent = formatIDR(metrics.totalOperatingCost);
  if (costPerKmEl) {
    costPerKmEl.textContent =
      metrics.costPerKm !== null ? `${formatIDR(metrics.costPerKm)} / km` : "Rp — / km";
  }
  if (fuelCostEl) {
    fuelCostEl.textContent = `${formatIDR(metrics.totalFuelCost)} (${formatLiters(
      metrics.totalFuelLiters
    )})`;
  }
  if (maintCostEl) maintCostEl.textContent = formatIDR(metrics.totalMaintenanceCost);

  renderServiceReminders(metrics.serviceReminders);
  renderMonthlySpendChart(metrics.monthlySpend);
  renderRecentLogs();
}

/**
 * @param {import("../types.js").DashboardMetrics["serviceReminders"]} reminders
 */
function renderServiceReminders(reminders) {
  const container = qs("#service-reminders-list");
  if (!container) return;

  if (!reminders.length) {
    container.innerHTML = `<p class="text-sm text-slate-500">Semua jadwal servis berada dalam batas aman.</p>`;
    return;
  }

  container.innerHTML = reminders
    .map((item) => {
      const badgeClass = item.overdue
        ? "bg-rose-100 text-rose-700"
        : "bg-amber-100 text-amber-800";
      const statusText = item.overdue
        ? `Lewat ${formatNumber(Math.abs(item.remainingKm), 0)} km`
        : `Sisa ${formatNumber(item.remainingKm, 0)} km`;
      return `
        <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5">
          <div>
            <p class="text-sm font-semibold text-slate-800">${escapeHtml(item.title)}</p>
            <p class="text-xs text-slate-500">Target servis: ${formatNumber(item.nextDueKm, 0)} km</p>
          </div>
          <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}">
            ${escapeHtml(statusText)}
          </span>
        </div>
      `;
    })
    .join("");
}

/**
 * @param {import("../types.js").DashboardMetrics["monthlySpend"]} monthlySpend
 */
function renderMonthlySpendChart(monthlySpend) {
  const container = qs("#monthly-spend-chart");
  if (!container) return;

  if (!monthlySpend.length) {
    container.innerHTML = `<p class="text-sm text-slate-500">Belum ada data pengeluaran bulanan.</p>`;
    return;
  }

  const maxCost = Math.max(...monthlySpend.map((m) => m.totalCost), 1);

  container.innerHTML = monthlySpend
    .map((m) => {
      const fuelPct = Math.round((m.fuelCost / maxCost) * 100);
      const maintPct = Math.round((m.maintenanceCost / maxCost) * 100);
      return `
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="font-medium text-slate-700">${escapeHtml(m.month)}</span>
            <span class="font-semibold text-slate-900">${escapeHtml(formatIDR(m.totalCost))}</span>
          </div>
          <div class="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div class="bg-sky-500" style="width: ${fuelPct}%" title="BBM: ${escapeHtml(
        formatIDR(m.fuelCost)
      )}"></div>
            <div class="bg-amber-500" style="width: ${maintPct}%" title="Servis: ${escapeHtml(
        formatIDR(m.maintenanceCost)
      )}"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderRecentLogs() {
  const container = qs("#recent-activity-list");
  if (!container) return;

  const combined = [
    ...state.fuelLogs.map((f) => ({
      type: /** @type {const} */ ("fuel"),
      logged_at: f.logged_at,
      odometer_km: Number(f.odometer_km),
      title: `${f.fuel_brand || "BBM"} • ${formatLiters(f.liters)}`,
      subtitle: f.station_name || (f.is_full_tank ? "Full Tank" : "Isi Sebagian"),
      cost: Number(f.total_cost)
    })),
    ...state.maintenanceLogs.map((m) => ({
      type: /** @type {const} */ ("maintenance"),
      logged_at: m.logged_at,
      odometer_km: Number(m.odometer_km),
      title: m.title,
      subtitle: m.workshop_name || MAINTENANCE_CATEGORIES[m.category] || "Servis",
      cost: Number(m.total_cost)
    }))
  ]
    .sort((a, b) => {
      const dateCmp = String(b.logged_at).localeCompare(String(a.logged_at));
      if (dateCmp !== 0) return dateCmp;
      return b.odometer_km - a.odometer_km;
    })
    .slice(0, 6);

  if (!combined.length) {
    container.innerHTML = `<p class="py-6 text-center text-sm text-slate-500">Belum ada catatan BBM atau servis untuk kendaraan ini.</p>`;
    return;
  }

  container.innerHTML = combined
    .map((item) => {
      const iconBg =
        item.type === "fuel"
          ? "bg-sky-100 text-sky-700"
          : "bg-amber-100 text-amber-700";
      const badge = item.type === "fuel" ? "BBM" : "Servis";
      return `
        <div class="flex items-center justify-between gap-3 py-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="rounded-md px-2 py-0.5 text-[11px] font-semibold ${iconBg}">${badge}</span>
              <p class="truncate text-sm font-semibold text-slate-900">${escapeHtml(item.title)}</p>
            </div>
            <p class="mt-0.5 text-xs text-slate-500">
              ${escapeHtml(formatDateID(item.logged_at))} • ${formatNumber(
        item.odometer_km,
        0
      )} km • ${escapeHtml(item.subtitle)}
            </p>
          </div>
          <p class="shrink-0 text-sm font-semibold text-slate-900">${escapeHtml(
            formatIDR(item.cost)
          )}</p>
        </div>
      `;
    })
    .join("");
}

async function loadActiveVehicleData() {
  const vehicle = getActiveVehicle();
  if (!vehicle) {
    state.fuelLogs = [];
    state.maintenanceLogs = [];
    renderDashboard();
    return;
  }
  state.activeVehicleId = vehicle.id;
  localStorage.setItem(STORAGE_VEHICLE_KEY, vehicle.id);

  const [fuelLogs, maintenanceLogs] = await Promise.all([
    listFuelLogs(vehicle.id),
    listMaintenanceLogs(vehicle.id)
  ]);
  state.fuelLogs = fuelLogs;
  state.maintenanceLogs = maintenanceLogs;
  renderDashboard();
}

function bindFuelTransactionCalculator() {
  const brandSelect = /** @type {HTMLSelectElement | null} */ (qs("#fuel-brand"));
  const totalInput = /** @type {HTMLInputElement | null} */ (qs("#fuel-total"));
  const priceInput = /** @type {HTMLInputElement | null} */ (qs("#fuel-price"));

  brandSelect?.addEventListener("change", syncFuelPriceFromSelection);
  totalInput?.addEventListener("input", updateCalculatedLitersPreview);
  priceInput?.addEventListener("input", updateCalculatedLitersPreview);
}

function bindDashboardEvents() {
  bindModalDismissHandlers();
  bindFuelTransactionCalculator();

  qs("#btn-signout")?.addEventListener("click", async () => {
    try {
      await signOut("./login.html");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal logout", "error");
    }
  });

  qs("#vehicle-selector")?.addEventListener("change", async (event) => {
    const select = /** @type {HTMLSelectElement} */ (event.target);
    state.activeVehicleId = select.value;
    await loadActiveVehicleData();
  });

  const openVehicleHandlers = ["#btn-open-vehicle-modal", "#btn-empty-add-vehicle"];
  for (const selector of openVehicleHandlers) {
    qs(selector)?.addEventListener("click", () => {
      const vehicleFuelSelect = /** @type {HTMLSelectElement | null} */ (
        qs("#vehicle-fuel-type")
      );
      renderFuelSelectOptions(vehicleFuelSelect, "Pertamax");
      openModal("modal-add-vehicle");
    });
  }

  qs("#btn-open-fuel-modal")?.addEventListener("click", () => {
    const vehicle = getActiveVehicle();
    if (!vehicle) {
      showToast("Tambahkan kendaraan terlebih dahulu.", "info");
      openModal("modal-add-vehicle");
      return;
    }

    const dateInput = /** @type {HTMLInputElement | null} */ (qs("#fuel-date"));
    const odoInput = /** @type {HTMLInputElement | null} */ (qs("#fuel-odometer"));
    const brandSelect = /** @type {HTMLSelectElement | null} */ (qs("#fuel-brand"));
    const totalInput = /** @type {HTMLInputElement | null} */ (qs("#fuel-total"));

    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
    if (odoInput) odoInput.placeholder = `Terakhir: ${vehicle.current_odometer_km} km`;
    if (totalInput) totalInput.value = "";

    renderFuelSelectOptions(brandSelect, vehicle.fuel_type || "Pertamax");
    syncFuelPriceFromSelection();
    openModal("modal-add-fuel");
  });

  qs("#btn-open-maint-modal")?.addEventListener("click", () => {
    const vehicle = getActiveVehicle();
    if (!vehicle) {
      showToast("Tambahkan kendaraan terlebih dahulu.", "info");
      openModal("modal-add-vehicle");
      return;
    }
    const dateInput = /** @type {HTMLInputElement | null} */ (qs("#maint-date"));
    const odoInput = /** @type {HTMLInputElement | null} */ (qs("#maint-odometer"));
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
    if (odoInput) odoInput.placeholder = `Terakhir: ${vehicle.current_odometer_km} km`;
    openModal("modal-add-maint");
  });

  qs("#form-add-vehicle")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setModalError("modal-add-vehicle", "");
    const form = /** @type {HTMLFormElement} */ (event.target);
    const submitBtn = /** @type {HTMLButtonElement | null} */ (qs("#btn-submit-vehicle"));
    setButtonLoading(submitBtn, true);

    try {
      const formData = new FormData(form);
      const created = await createVehicle({
        name: String(formData.get("name") || ""),
        plate_number: String(formData.get("plate_number") || ""),
        brand_model: String(formData.get("brand_model") || ""),
        fuel_type: String(formData.get("fuel_type") || "Pertamax"),
        tank_capacity_liters: Number(
          String(formData.get("tank_capacity_liters") || "3.7").replace(",", ".")
        ),
        initial_odometer_km: Number(
          String(formData.get("initial_odometer_km") || "0").replace(",", ".")
        )
      });

      state.vehicles.push(created);
      state.activeVehicleId = created.id;
      renderVehicleSelector();
      await loadActiveVehicleData();
      form.reset();
      closeModal("modal-add-vehicle");
      showToast(`Kendaraan "${created.name}" berhasil ditambahkan.`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan kendaraan.";
      setModalError("modal-add-vehicle", msg);
      showToast(msg, "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  qs("#form-add-fuel")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setModalError("modal-add-fuel", "");
    const vehicle = getActiveVehicle();
    if (!vehicle) return;

    const form = /** @type {HTMLFormElement} */ (event.target);
    const submitBtn = /** @type {HTMLButtonElement | null} */ (qs("#btn-submit-fuel"));
    setButtonLoading(submitBtn, true);

    try {
      const formData = new FormData(form);
      const totalCost = Number(String(formData.get("total_cost") || "").replace(",", "."));
      const pricePerLiter = Number(
        String(formData.get("price_per_liter") || "").replace(",", ".")
      );
      const calculatedLiters = calculateLitersFromCost(totalCost, pricePerLiter);

      await createFuelLog({
        vehicle_id: vehicle.id,
        logged_at: String(formData.get("logged_at") || ""),
        odometer_km: Number(String(formData.get("odometer_km") || "").replace(",", ".")),
        liters: calculatedLiters,
        price_per_liter: pricePerLiter,
        total_cost: totalCost,
        fuel_brand: String(formData.get("fuel_brand") || "Pertamax"),
        station_name: String(formData.get("station_name") || ""),
        is_full_tank: formData.get("is_full_tank") === "on",
        notes: String(formData.get("notes") || "")
      });

      state.vehicles = await listVehicles();
      renderVehicleSelector();
      await loadActiveVehicleData();
      form.reset();
      updateCalculatedLitersPreview();
      closeModal("modal-add-fuel");
      showToast(`Catatan BBM tersimpan (${formatLiters(calculatedLiters)}).`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan BBM.";
      setModalError("modal-add-fuel", msg);
      showToast(msg, "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  qs("#form-add-maint")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setModalError("modal-add-maint", "");
    const vehicle = getActiveVehicle();
    if (!vehicle) return;

    const form = /** @type {HTMLFormElement} */ (event.target);
    const submitBtn = /** @type {HTMLButtonElement | null} */ (qs("#btn-submit-maint"));
    setButtonLoading(submitBtn, true);

    try {
      const formData = new FormData(form);
      await createMaintenanceLog({
        vehicle_id: vehicle.id,
        logged_at: String(formData.get("logged_at") || ""),
        odometer_km: Number(String(formData.get("odometer_km") || "").replace(",", ".")),
        category: /** @type {import("../types.js").MaintenanceLog["category"]} */ (
          String(formData.get("category") || "other")
        ),
        title: String(formData.get("title") || ""),
        workshop_name: String(formData.get("workshop_name") || ""),
        total_cost: Number(String(formData.get("total_cost") || "0").replace(",", ".")),
        next_due_km: formData.get("next_due_km")
          ? Number(String(formData.get("next_due_km")).replace(",", "."))
          : null,
        notes: String(formData.get("notes") || "")
      });

      state.vehicles = await listVehicles();
      renderVehicleSelector();
      await loadActiveVehicleData();
      form.reset();
      closeModal("modal-add-maint");
      showToast("Catatan servis berhasil disimpan.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan servis.";
      setModalError("modal-add-maint", msg);
      showToast(msg, "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

async function initDashboard() {
  try {
    const user = await requireAuth("./login.html");
    const userEmailEl = qs("#user-email");
    if (userEmailEl) userEmailEl.textContent = user.email || "";

    bindDashboardEvents();

    const [vehicles, fuelPrices] = await Promise.all([listVehicles(), listFuelPrices()]);
    state.vehicles = vehicles;
    state.fuelPrices = fuelPrices;

    renderFuelSelectOptions(
      /** @type {HTMLSelectElement | null} */ (qs("#vehicle-fuel-type")),
      "Pertamax"
    );

    const savedId = localStorage.getItem(STORAGE_VEHICLE_KEY) || "";
    if (savedId && state.vehicles.some((v) => v.id === savedId)) {
      state.activeVehicleId = savedId;
    } else if (state.vehicles.length > 0) {
      state.activeVehicleId = state.vehicles[0].id;
    }

    renderVehicleSelector();
    await loadActiveVehicleData();
  } catch (err) {
    if (err instanceof Error && err.message === "AUTH_REDIRECT") return;
    showToast(err instanceof Error ? err.message : "Gagal memuat dashboard.", "error");
  }
}

document.addEventListener("DOMContentLoaded", initDashboard);