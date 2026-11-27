import { requireAuth, signOut } from "../services/auth-service.js";
import {
  DEFAULT_FUEL_PRICES,
  createFuelLog,
  createMaintenanceLog,
  createVehicle,
  listFuelLogs,
  listFuelPrices,
  listMaintenanceLogs,
  listVehicles,
  updateVehicle
} from "../services/vehicle-service.js";
import {
  DEFAULT_SERVICE_INTERVALS_KM,
  MAINTENANCE_CATEGORIES,
  calculateLitersFromCost,
  calculateNextTaxDueDate,
  formatDateID,
  formatIDR,
  formatLiters,
  formatNumber,
  summarizeFuelBrandBreakdown,
  summarizeMonthlySpend,
  summarizeServiceReminders,
  summarizeTaxReminders,
  summarizeVehicleTelemetry
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
  activeVehicleId: "",
  /** @type {import("../types.js").FuelPriceOption[]} */
  fuelPrices: [...DEFAULT_FUEL_PRICES],
  /** @type {import("../types.js").FuelLog[]} */
  fuelLogs: [],
  /** @type {import("../types.js").MaintenanceLog[]} */
  maintenanceLogs: []
};

function getActiveVehicle() {
  return state.vehicles.find((v) => v.id === state.activeVehicleId) || null;
}

function getTodayIsoDate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

/**
 * @param {string} [preferredName]
 * @returns {import("../types.js").FuelPriceOption}
 */
function resolveDefaultFuelOption(preferredName) {
  const target = String(preferredName || "").trim().toLowerCase();
  if (target) {
    const exact = state.fuelPrices.find((p) => p.product_name.toLowerCase() === target);
    if (exact) return exact;
    const partial = state.fuelPrices.find((p) => p.product_name.toLowerCase().includes(target));
    if (partial) return partial;
  }
  return (
    state.fuelPrices.find((p) => p.product_name === "Pertamax") ||
    state.fuelPrices[0] ||
    DEFAULT_FUEL_PRICES[1]
  );
}

/**
 * @param {HTMLSelectElement | null} selectEl
 * @param {string} [selectedProductName]
 */
function renderFuelSelectOptions(selectEl, selectedProductName) {
  if (!selectEl) return;

  /** @type {Map<string, import("../types.js").FuelPriceOption[]>} */
  const grouped = new Map();
  for (const item of state.fuelPrices) {
    const list = grouped.get(item.brand) || [];
    list.push(item);
    grouped.set(item.brand, list);
  }

  const targetLower = String(selectedProductName || "").trim().toLowerCase();
  let hasSelection = false;

  const html = [...grouped.entries()]
    .map(([brand, items]) => {
      const optionsHtml = items
        .map((item) => {
          const isSelected = !hasSelection && item.product_name.toLowerCase() === targetLower;
          if (isSelected) hasSelection = true;
          const ronTag = item.ron ? ` (RON ${item.ron})` : "";
          return `<option value="${escapeHtml(item.product_name)}" data-price="${
            item.price_per_liter
          }" ${isSelected ? "selected" : ""}>${escapeHtml(item.product_name)}${ronTag}</option>`;
        })
        .join("");
      return `<optgroup label="${escapeHtml(brand)}">${optionsHtml}</optgroup>`;
    })
    .join("");

  selectEl.innerHTML = html;
}

function updateFuelLitersPreview() {
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
    previewEl.classList.remove("text-sky-700");
    previewEl.classList.add("text-slate-400");
  }
}

function updateMaintIntervalHint() {
  const categorySelect = /** @type {HTMLSelectElement | null} */ (qs("#maint-category"));
  const odoInput = /** @type {HTMLInputElement | null} */ (qs("#maint-odometer"));
  const hintBox = /** @type {HTMLElement | null} */ (qs("#maint-interval-hint"));
  const labelEl = qs("#maint-interval-label");
  if (!categorySelect || !hintBox || !labelEl) return;

  const interval = DEFAULT_SERVICE_INTERVALS_KM[categorySelect.value];
  const baseOdo = Number(String(odoInput?.value || "0").replace(",", "."));

  if (!interval || !Number.isFinite(baseOdo) || baseOdo < 0) {
    hintBox.classList.add("hidden");
    hintBox.classList.remove("flex");
    return;
  }

  const targetKm = Math.round(baseOdo + interval);
  labelEl.textContent = `Saran interval +${formatNumber(interval, 0)} km → Target: ${formatNumber(
    targetKm,
    0
  )} km`;
  hintBox.dataset.suggestedKm = String(targetKm);
  hintBox.classList.remove("hidden");
  hintBox.classList.add("flex");
}

function renderVehicleSelector() {
  const select = /** @type {HTMLSelectElement | null} */ (qs("#vehicle-selector"));
  const emptyBanner = qs("#empty-vehicle-banner");
  const dashboardMain = qs("#dashboard-main");
  const metaBadge = qs("#vehicle-meta-badge");

  if (!select) return;

  if (!state.vehicles.length) {
    select.innerHTML = `<option value="">Belum ada kendaraan</option>`;
    emptyBanner?.classList.remove("hidden");
    dashboardMain?.classList.add("hidden");
    if (metaBadge) metaBadge.textContent = "0 Kendaraan";
    return;
  }

  emptyBanner?.classList.add("hidden");
  dashboardMain?.classList.remove("hidden");

  select.innerHTML = state.vehicles
    .map((v) => {
      const label = v.plate_number ? `${v.name} (${v.plate_number})` : v.name;
      const selected = v.id === state.activeVehicleId ? "selected" : "";
      return `<option value="${escapeHtml(v.id)}" ${selected}>${escapeHtml(label)}</option>`;
    })
    .join("");

  const active = getActiveVehicle();
  if (metaBadge && active) {
    metaBadge.textContent = `${active.fuel_type || "Pertamax"} • Tangki ${formatLiters(
      active.tank_capacity_liters ?? 3.7
    )}`;
  }
}

function renderDashboard() {
  const vehicle = getActiveVehicle();
  const telemetry = summarizeVehicleTelemetry(
    vehicle,
    state.fuelLogs,
    state.maintenanceLogs
  );

  const elOdo = qs("#kpi-odometer");
  const elDist = qs("#kpi-distance");
  const elAvgKmpl = qs("#kpi-avg-kmpl");
  const elLastKmpl = qs("#kpi-last-kmpl");
  const elTotalCost = qs("#kpi-total-cost");
  const elCostPerKm = qs("#kpi-cost-per-km");
  const elFuelCost = qs("#kpi-fuel-cost");
  const elMaintCost = qs("#kpi-maint-cost");

  if (elOdo) elOdo.textContent = `${formatNumber(telemetry.currentOdometer, 0)} km`;
  if (elDist) elDist.textContent = `Jarak tercatat: ${formatNumber(telemetry.trackedDistance, 0)} km`;

  if (elAvgKmpl) {
    elAvgKmpl.textContent =
      telemetry.avgKmPerLiter !== null ? `${formatNumber(telemetry.avgKmPerLiter, 2)} km/L` : "— km/L";
  }
  if (elLastKmpl) {
    elLastKmpl.textContent =
      telemetry.lastKmPerLiter !== null
        ? `Terakhir: ${formatNumber(telemetry.lastKmPerLiter, 2)} km/L`
        : "Butuh min. 2x full tank";
  }

  if (elTotalCost) elTotalCost.textContent = formatIDR(telemetry.totalSpend);
  if (elCostPerKm) {
    elCostPerKm.textContent =
      telemetry.costPerKm !== null ? `${formatIDR(telemetry.costPerKm)} / km` : "Rp — / km";
  }

  if (elFuelCost) {
    elFuelCost.textContent = `${formatIDR(telemetry.totalFuelCost)} (${formatLiters(
      telemetry.totalFuelLiters
    )})`;
  }
  if (elMaintCost) elMaintCost.textContent = formatIDR(telemetry.totalMaintenanceCost);

  renderServiceReminders(
    summarizeServiceReminders(state.maintenanceLogs, telemetry.currentOdometer)
  );
  renderMonthlyChart(summarizeMonthlySpend(state.fuelLogs, state.maintenanceLogs, 6));
  renderEfficiencyTrend(vehicle, telemetry);
  renderFuelBrandBreakdown();
  renderRecentActivity();
}

function renderServiceReminders(reminders) {
  const container = qs("#service-reminders-list");
  if (!container) return;

  const vehicle = getActiveVehicle();
  const taxItems = summarizeTaxReminders(vehicle, getTodayIsoDate(), state.maintenanceLogs);

  if (!taxItems.length && !reminders.length) {
    container.innerHTML = `<p class="text-sm text-slate-500">Semua jadwal servis &amp; pajak berada dalam batas aman.</p>`;
    return;
  }

  const taxHtml = taxItems
    .map((item) => {
      const badgeClass = item.overdue
        ? "bg-rose-100 text-rose-700"
        : item.urgent
          ? "bg-amber-100 text-amber-800"
          : item.paid
            ? "bg-emerald-100 text-emerald-700"
            : "bg-sky-100 text-sky-700";

      const statusText = item.overdue
        ? `Terlambat ${Math.abs(item.daysRemaining)} hari`
        : item.daysRemaining === 0
          ? "Jatuh tempo hari ini"
          : item.paid && item.kind === "tax"
            ? `Sudah Dibayar (${item.daysRemaining} hari lagi)`
            : `${item.daysRemaining} hari lagi`;

      const actionBtnHtml = item.canPay
        ? `<button
            type="button"
            data-pay-tax="${escapeHtml(item.kind)}"
            class="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition"
          >
            Sudah Bayar
          </button>`
        : "";

      return `
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5">
          <div>
            <p class="text-sm font-semibold text-slate-800">${escapeHtml(item.label)}</p>
            <p class="text-xs text-slate-500">Jatuh tempo: ${escapeHtml(formatDateID(item.dueDate))}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}">
              ${escapeHtml(statusText)}
            </span>
            ${actionBtnHtml}
          </div>
        </div>
      `;
    })
    .join("");

  const serviceHtml = reminders
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

  container.innerHTML = taxHtml + serviceHtml;
}

function renderMonthlyChart(buckets) {
  const container = qs("#monthly-spend-chart");
  if (!container) return;

  const maxTotal = Math.max(...buckets.map((b) => b.total), 1);

  container.innerHTML = buckets
    .map((b) => {
      const fuelPct = Math.round((b.fuel / maxTotal) * 100);
      const maintPct = Math.round((b.maintenance / maxTotal) * 100);
      return `
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="font-medium text-slate-600">${escapeHtml(b.label)}</span>
            <span class="font-semibold text-slate-800">${escapeHtml(formatIDR(b.total))}</span>
          </div>
          <div class="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div class="bg-sky-500 transition-all" style="width: ${fuelPct}%" title="BBM: ${escapeHtml(formatIDR(b.fuel))}"></div>
            <div class="bg-amber-500 transition-all" style="width: ${maintPct}%" title="Servis: ${escapeHtml(formatIDR(b.maintenance))}"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderEfficiencyTrend(vehicle, telemetry) {
  const container = qs("#efficiency-trend-chart");
  const rangeBadge = qs("#kpi-tank-range");
  const tankCap = Number(vehicle?.tank_capacity_liters ?? 3.7);

  if (rangeBadge) {
    if (telemetry.avgKmPerLiter !== null && tankCap > 0) {
      const estRange = Math.round(telemetry.avgKmPerLiter * tankCap);
      rangeBadge.textContent = `1 Tangki (${formatLiters(tankCap)}): ~${formatNumber(estRange, 0)} km`;
    } else {
      rangeBadge.textContent = "Estimasi tangki: — km";
    }
  }

  if (!container) return;

  const recentPoints = telemetry.efficiencySeries.slice(-8);
  if (!recentPoints.length) {
    container.innerHTML = `<p class="text-sm text-slate-500">Catat minimal 2 kali pengisian <strong>Full Tank</strong> untuk melihat grafik tren km/L.</p>`;
    return;
  }

  const maxKmpl = Math.max(...recentPoints.map((p) => p.km_per_liter), 1);
  const bestKmpl = Math.max(...recentPoints.map((p) => p.km_per_liter));

  container.innerHTML = recentPoints
    .map((pt) => {
      const pct = Math.max(8, Math.round((pt.km_per_liter / maxKmpl) * 100));
      const isBest = pt.km_per_liter === bestKmpl && recentPoints.length > 1;
      const barColor = isBest ? "bg-emerald-500" : "bg-sky-500";
      return `
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-600">
              ${escapeHtml(formatDateID(pt.logged_at))}
              <span class="text-slate-400">(${formatNumber(pt.distance_km, 0)} km / ${formatLiters(pt.liters_used)})</span>
            </span>
            <span class="font-bold ${isBest ? "text-emerald-700" : "text-slate-900"}">
              ${formatNumber(pt.km_per_liter, 2)} km/L
            </span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div class="${barColor} h-full rounded-full transition-all" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderFuelBrandBreakdown() {
  const container = qs("#fuel-brand-breakdown");
  if (!container) return;

  const rows = summarizeFuelBrandBreakdown(state.fuelLogs);
  if (!rows.length) {
    container.innerHTML = `<p class="text-sm text-slate-500">Belum ada data pengisian BBM.</p>`;
    return;
  }

  container.innerHTML = rows
    .map(
      (row) => `
      <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
        <div>
          <p class="text-sm font-semibold text-slate-900">${escapeHtml(row.brand)}</p>
          <p class="text-xs text-slate-500">
            ${row.fillCount}x isi • ${formatLiters(row.totalLiters)} • Rata-rata ${escapeHtml(formatIDR(row.avgPricePerLiter))}/L
          </p>
        </div>
        <p class="shrink-0 text-sm font-bold text-slate-900">${escapeHtml(formatIDR(row.totalCost))}</p>
      </div>
    `
    )
    .join("");
}

function renderRecentActivity() {
  const container = qs("#recent-activity-list");
  if (!container) return;

  const combined = [
    ...state.fuelLogs.map((f) => ({
      kind: "BBM",
      badgeClass: "bg-sky-100 text-sky-700",
      logged_at: f.logged_at,
      odometer_km: Number(f.odometer_km),
      title: `${f.fuel_brand || "BBM"} • ${formatLiters(f.liters)}`,
      subtitle: f.station_name || (f.is_full_tank ? "Full tank" : "Isi parsial"),
      cost: Number(f.total_cost)
    })),
    ...state.maintenanceLogs.map((m) => ({
      kind: "Servis",
      badgeClass: "bg-amber-100 text-amber-700",
      logged_at: m.logged_at,
      odometer_km: Number(m.odometer_km),
      title: m.title,
      subtitle: MAINTENANCE_CATEGORIES[m.category] || m.category,
      cost: Number(m.total_cost)
    }))
  ]
    .sort((a, b) => {
      const d = String(b.logged_at).localeCompare(String(a.logged_at));
      if (d !== 0) return d;
      return b.odometer_km - a.odometer_km;
    })
    .slice(0, 6);

  if (!combined.length) {
    container.innerHTML = `<p class="py-4 text-sm text-slate-500">Belum ada catatan BBM atau servis untuk kendaraan ini.</p>`;
    return;
  }

  container.innerHTML = combined
    .map(
      (item) => `
      <div class="flex items-center justify-between gap-3 py-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="rounded-md px-2 py-0.5 text-[11px] font-semibold ${item.badgeClass}">${item.kind}</span>
            <p class="truncate text-sm font-semibold text-slate-800">${escapeHtml(item.title)}</p>
          </div>
          <p class="mt-0.5 text-xs text-slate-500">${escapeHtml(formatDateID(item.logged_at))} • ${formatNumber(item.odometer_km, 0)} km • ${escapeHtml(item.subtitle)}</p>
        </div>
        <p class="shrink-0 text-sm font-semibold text-slate-900">${escapeHtml(formatIDR(item.cost))}</p>
      </div>
    `
    )
    .join("");
}

/**
 * Automatically persists reconciled tax_due_date / plate_due_date to the vehicle row
 * if a payment log was already recorded in maintenance_logs.
 */
async function syncVehicleTaxDatesFromLogs() {
  const vehicle = getActiveVehicle();
  if (!vehicle) return;

  const taxItems = summarizeTaxReminders(vehicle, getTodayIsoDate(), state.maintenanceLogs);
  /** @type {Partial<import("../types.js").Vehicle>} */
  const updates = {};

  for (const item of taxItems) {
    if (!item.needsProfileSync) continue;
    if (item.kind === "tax" && vehicle.tax_due_date !== item.dueDate) {
      updates.tax_due_date = item.dueDate;
    }
    if (item.kind === "plate" && vehicle.plate_due_date !== item.dueDate) {
      updates.plate_due_date = item.dueDate;
    }
  }

  if (Object.keys(updates).length > 0) {
    try {
      const updated = await updateVehicle(vehicle.id, updates);
      state.vehicles = state.vehicles.map((v) =>
        v.id === vehicle.id ? { ...v, ...updated } : v
      );
    } catch {
      // Tetap tampilkan hasil rekonsiliasi lokal meskipun gagal update latar belakang
    }
  }
}

async function loadActiveVehicleData() {
  if (!state.activeVehicleId) {
    state.fuelLogs = [];
    state.maintenanceLogs = [];
    renderDashboard();
    return;
  }

  localStorage.setItem(STORAGE_VEHICLE_KEY, state.activeVehicleId);
  const [fuelLogs, maintenanceLogs] = await Promise.all([
    listFuelLogs(state.activeVehicleId),
    listMaintenanceLogs(state.activeVehicleId)
  ]);

  state.fuelLogs = fuelLogs;
  state.maintenanceLogs = maintenanceLogs;
  await syncVehicleTaxDatesFromLogs();
  renderDashboard();
}

function bindDashboardEvents() {
  bindModalDismissHandlers();

  qs("#btn-signout")?.addEventListener("click", async () => {
    await signOut("./login.html");
  });

  qs("#vehicle-selector")?.addEventListener("change", async (event) => {
    const select = /** @type {HTMLSelectElement} */ (event.target);
    state.activeVehicleId = select.value;
    renderVehicleSelector();
    await loadActiveVehicleData();
  });

  const openVehicleModal = () => {
    setModalError("modal-add-vehicle", "");
    renderFuelSelectOptions(
      /** @type {HTMLSelectElement | null} */ (qs("#vehicle-fuel-type")),
      "Pertamax"
    );
    openModal("modal-add-vehicle");
  };
  qs("#btn-open-vehicle-modal")?.addEventListener("click", openVehicleModal);
  qs("#btn-empty-add-vehicle")?.addEventListener("click", openVehicleModal);

  qs("#btn-open-edit-vehicle-modal")?.addEventListener("click", () => {
    const vehicle = getActiveVehicle();
    if (!vehicle) {
      showToast("Tambahkan kendaraan terlebih dahulu.", "info");
      openVehicleModal();
      return;
    }

    setModalError("modal-edit-vehicle", "");
    /** @type {HTMLInputElement | null} */ (qs("#edit-vehicle-name")).value = vehicle.name || "";
    /** @type {HTMLInputElement | null} */ (qs("#edit-vehicle-plate")).value =
      vehicle.plate_number || "";
    /** @type {HTMLInputElement | null} */ (qs("#edit-vehicle-tank")).value = String(
      vehicle.tank_capacity_liters ?? 3.7
    );
    /** @type {HTMLInputElement | null} */ (qs("#edit-vehicle-brand-model")).value =
      vehicle.brand_model || "";
    /** @type {HTMLInputElement | null} */ (qs("#edit-vehicle-tax-due")).value =
      vehicle.tax_due_date ? String(vehicle.tax_due_date).slice(0, 10) : "";
    /** @type {HTMLInputElement | null} */ (qs("#edit-vehicle-plate-due")).value =
      vehicle.plate_due_date ? String(vehicle.plate_due_date).slice(0, 10) : "";

    renderFuelSelectOptions(
      /** @type {HTMLSelectElement | null} */ (qs("#edit-vehicle-fuel-type")),
      vehicle.fuel_type || "Pertamax"
    );
    openModal("modal-edit-vehicle");
  });

  qs("#btn-open-fuel-modal")?.addEventListener("click", () => {
    const active = getActiveVehicle();
    if (!active) {
      showToast("Tambahkan kendaraan terlebih dahulu.", "info");
      openVehicleModal();
      return;
    }
    setModalError("modal-add-fuel", "");
    const telemetry = summarizeVehicleTelemetry(
      active,
      state.fuelLogs,
      state.maintenanceLogs
    );

    const dateInput = /** @type {HTMLInputElement | null} */ (qs("#fuel-date"));
    const odoInput = /** @type {HTMLInputElement | null} */ (qs("#fuel-odometer"));
    const brandSelect = /** @type {HTMLSelectElement | null} */ (qs("#fuel-brand"));
    const priceInput = /** @type {HTMLInputElement | null} */ (qs("#fuel-price"));
    const totalInput = /** @type {HTMLInputElement | null} */ (qs("#fuel-total"));
    const stationInput = /** @type {HTMLInputElement | null} */ (qs("#fuel-station"));

    const lastFuel = state.fuelLogs[0];
    const defaultFuel = resolveDefaultFuelOption(lastFuel?.fuel_brand || active.fuel_type);

    if (dateInput) dateInput.value = getTodayIsoDate();
    if (odoInput) odoInput.value = String(telemetry.currentOdometer || "");
    renderFuelSelectOptions(brandSelect, defaultFuel.product_name);
    if (priceInput) {
      priceInput.value = String(
        lastFuel && lastFuel.fuel_brand === defaultFuel.product_name && Number(lastFuel.price_per_liter) > 0
          ? lastFuel.price_per_liter
          : defaultFuel.price_per_liter
      );
    }
    if (totalInput) totalInput.value = "";
    if (stationInput && !stationInput.value && lastFuel?.station_name) {
      stationInput.value = lastFuel.station_name;
    }
    updateFuelLitersPreview();
    openModal("modal-add-fuel");
  });

  qs("#fuel-brand")?.addEventListener("change", (event) => {
    const select = /** @type {HTMLSelectElement} */ (event.target);
    const chosen = select.options[select.selectedIndex];
    const refPrice = Number(chosen?.dataset?.price || 0);
    const priceInput = /** @type {HTMLInputElement | null} */ (qs("#fuel-price"));
    if (priceInput && refPrice > 0) {
      priceInput.value = String(refPrice);
      updateFuelLitersPreview();
    }
  });

  qs("#fuel-total")?.addEventListener("input", updateFuelLitersPreview);
  qs("#fuel-price")?.addEventListener("input", updateFuelLitersPreview);

  document.querySelectorAll("[data-fuel-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const amount = btn.getAttribute("data-fuel-preset") || "";
      const totalInput = /** @type {HTMLInputElement | null} */ (qs("#fuel-total"));
      if (totalInput && amount) {
        totalInput.value = amount;
        updateFuelLitersPreview();
      }
    });
  });

  qs("#btn-open-maint-modal")?.addEventListener("click", () => {
    const active = getActiveVehicle();
    if (!active) {
      showToast("Tambahkan kendaraan terlebih dahulu.", "info");
      openVehicleModal();
      return;
    }
    setModalError("modal-add-maint", "");
    const telemetry = summarizeVehicleTelemetry(
      active,
      state.fuelLogs,
      state.maintenanceLogs
    );

    const dateInput = /** @type {HTMLInputElement | null} */ (qs("#maint-date"));
    const odoInput = /** @type {HTMLInputElement | null} */ (qs("#maint-odometer"));
    const workshopInput = /** @type {HTMLInputElement | null} */ (qs("#maint-workshop"));
    const nextDueInput = /** @type {HTMLInputElement | null} */ (qs("#maint-next-due"));
    const lastMaint = state.maintenanceLogs[0];

    if (dateInput) dateInput.value = getTodayIsoDate();
    if (odoInput) odoInput.value = String(telemetry.currentOdometer || "");
    if (nextDueInput) nextDueInput.value = "";
    if (workshopInput && !workshopInput.value && lastMaint?.workshop_name) {
      workshopInput.value = lastMaint.workshop_name;
    }
    updateMaintIntervalHint();
    openModal("modal-add-maint");
  });

  qs("#maint-category")?.addEventListener("change", updateMaintIntervalHint);
  qs("#maint-odometer")?.addEventListener("input", updateMaintIntervalHint);

  qs("#btn-apply-maint-interval")?.addEventListener("click", () => {
    const hintBox = /** @type {HTMLElement | null} */ (qs("#maint-interval-hint"));
    const nextDueInput = /** @type {HTMLInputElement | null} */ (qs("#maint-next-due"));
    const suggested = hintBox?.dataset?.suggestedKm;
    if (nextDueInput && suggested) {
      nextDueInput.value = suggested;
    }
  });

  qs("#service-reminders-list")?.addEventListener("click", (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    const btn = target.closest("[data-pay-tax]");
    if (!btn) return;

    const kind = btn.getAttribute("data-pay-tax") === "plate" ? "plate" : "tax";
    const vehicle = getActiveVehicle();
    if (!vehicle) return;

    setModalError("modal-pay-tax", "");
    const todayStr = getTodayIsoDate();
    const currentDue = kind === "plate" ? vehicle.plate_due_date : vehicle.tax_due_date;
    const nextDue = calculateNextTaxDueDate(currentDue, kind, todayStr);

    const titleEl = qs("#pay-tax-modal-title");
    const summaryEl = qs("#pay-tax-summary");
    const prevDueEl = qs("#pay-tax-prev-due");
    const kindInput = /** @type {HTMLInputElement | null} */ (qs("#pay-tax-kind"));
    const paidDateInput = /** @type {HTMLInputElement | null} */ (qs("#pay-tax-date"));
    const nextDueInput = /** @type {HTMLInputElement | null} */ (qs("#pay-tax-next-due"));
    const costInput = /** @type {HTMLInputElement | null} */ (qs("#pay-tax-cost"));
    const recordCheckbox = /** @type {HTMLInputElement | null} */ (qs("#pay-tax-record-expense"));
    const expenseFields = qs("#pay-tax-expense-fields");

    if (titleEl) {
      titleEl.textContent =
        kind === "plate"
          ? "Konfirmasi Perpanjangan Plat 5 Tahunan"
          : "Konfirmasi Pembayaran Pajak STNK";
    }
    if (summaryEl) {
      summaryEl.textContent = `${vehicle.name}${
        vehicle.plate_number ? ` (${vehicle.plate_number})` : ""
      }`;
    }
    if (prevDueEl) {
      prevDueEl.textContent = currentDue
        ? `Jatuh tempo sebelumnya: ${formatDateID(currentDue)} → Diperpanjang ke ${formatDateID(
            nextDue
          )}`
        : `Jatuh tempo berikutnya ditetapkan ke ${formatDateID(nextDue)}`;
    }
    if (kindInput) kindInput.value = kind;
    if (paidDateInput) paidDateInput.value = todayStr;
    if (nextDueInput) nextDueInput.value = nextDue;
    if (costInput) costInput.value = "";
    if (recordCheckbox) recordCheckbox.checked = true;
    expenseFields?.classList.remove("hidden");

    openModal("modal-pay-tax");
  });

  qs("#pay-tax-record-expense")?.addEventListener("change", (event) => {
    const checkbox = /** @type {HTMLInputElement} */ (event.target);
    qs("#pay-tax-expense-fields")?.classList.toggle("hidden", !checkbox.checked);
  });

  qs("#form-pay-tax")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setModalError("modal-pay-tax", "");
    const vehicle = getActiveVehicle();
    if (!vehicle) return;

    const form = /** @type {HTMLFormElement} */ (event.target);
    const submitBtn = /** @type {HTMLButtonElement | null} */ (qs("#btn-submit-pay-tax"));
    setButtonLoading(submitBtn, true);

    try {
      const formData = new FormData(form);
      const kind = String(formData.get("kind") || "tax") === "plate" ? "plate" : "tax";
      const paidAt = String(formData.get("paid_at") || getTodayIsoDate());
      const nextDueDate = String(formData.get("next_due_date") || "").trim();
      const recordExpense = formData.get("record_expense") === "on";
      const totalCost = Number(String(formData.get("total_cost") || "0").replace(",", "."));
      const channel = String(formData.get("channel") || "").trim();

      if (!nextDueDate) {
        throw new Error("Tanggal jatuh tempo baru wajib diisi.");
      }

      const vehicleUpdates =
        kind === "plate"
          ? { plate_due_date: nextDueDate }
          : { tax_due_date: nextDueDate };

      const updatedVehicle = await updateVehicle(vehicle.id, vehicleUpdates);
      state.vehicles = state.vehicles.map((item) =>
        item.id === vehicle.id ? { ...item, ...updatedVehicle } : item
      );

      if (recordExpense && totalCost > 0) {
        const telemetry = summarizeVehicleTelemetry(
          updatedVehicle,
          state.fuelLogs,
          state.maintenanceLogs
        );
        const label =
          kind === "plate"
            ? "Perpanjangan STNK & Ganti Plat 5 Tahunan"
            : "Pembayaran Pajak Tahunan (STNK)";

        await createMaintenanceLog({
          vehicle_id: vehicle.id,
          logged_at: paidAt,
          odometer_km: telemetry.currentOdometer,
          category: "other",
          title: label,
          workshop_name: channel || "Samsat / SIGNAL",
          total_cost: totalCost,
          next_due_km: null,
          notes: `Jatuh tempo diperpanjang s.d. ${formatDateID(nextDueDate)}`
        });
      }

      closeModal("modal-pay-tax");
      await loadActiveVehicleData();
      showToast(
        kind === "plate"
          ? `Perpanjangan plat 5 tahunan dicatat s.d. ${formatDateID(nextDueDate)}.`
          : `Pajak STNK lunas! Jatuh tempo baru: ${formatDateID(nextDueDate)}.`,
        "success"
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan pembayaran pajak.";
      setModalError("modal-pay-tax", msg);
      showToast(msg, "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
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
        fuel_type: String(formData.get("fuel_type") || "Pertamax"),
        tank_capacity_liters: Number(formData.get("tank_capacity_liters") || 3.7),
        initial_odometer_km: Number(formData.get("initial_odometer_km") || 0),
        tax_due_date: String(formData.get("tax_due_date") || "") || null,
        plate_due_date: String(formData.get("plate_due_date") || "") || null
      });

      state.vehicles.push(created);
      state.activeVehicleId = created.id;
      form.reset();
      closeModal("modal-add-vehicle");
      renderVehicleSelector();
      await loadActiveVehicleData();
      showToast(`Kendaraan "${created.name}" berhasil ditambahkan.`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan kendaraan.";
      setModalError("modal-add-vehicle", msg);
      showToast(msg, "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  qs("#form-edit-vehicle")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setModalError("modal-edit-vehicle", "");
    const vehicle = getActiveVehicle();
    if (!vehicle) return;

    const form = /** @type {HTMLFormElement} */ (event.target);
    const submitBtn = /** @type {HTMLButtonElement | null} */ (qs("#btn-submit-edit-vehicle"));
    setButtonLoading(submitBtn, true);

    try {
      const formData = new FormData(form);
      const updated = await updateVehicle(vehicle.id, {
        name: String(formData.get("name") || "").trim(),
        plate_number: String(formData.get("plate_number") || "").trim(),
        brand_model: String(formData.get("brand_model") || "").trim(),
        fuel_type: String(formData.get("fuel_type") || "Pertamax"),
        tank_capacity_liters: Number(
          String(formData.get("tank_capacity_liters") || "3.7").replace(",", ".")
        ),
        tax_due_date: String(formData.get("tax_due_date") || "") || null,
        plate_due_date: String(formData.get("plate_due_date") || "") || null
      });

      state.vehicles = state.vehicles.map((item) =>
        item.id === vehicle.id ? { ...item, ...updated } : item
      );
      renderVehicleSelector();
      renderDashboard();
      closeModal("modal-edit-vehicle");
      showToast(`Profil "${updated.name || vehicle.name}" berhasil diperbarui.`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui kendaraan.";
      setModalError("modal-edit-vehicle", msg);
      showToast(msg, "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  qs("#form-add-fuel")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setModalError("modal-add-fuel", "");
    const form = /** @type {HTMLFormElement} */ (event.target);
    const submitBtn = /** @type {HTMLButtonElement | null} */ (qs("#btn-submit-fuel"));
    setButtonLoading(submitBtn, true);

    try {
      const formData = new FormData(form);
      const totalCost = Number(String(formData.get("total_cost") || "").replace(",", "."));
      const pricePerLiter = Number(
        String(formData.get("price_per_liter") || "").replace(",", ".")
      );

      await createFuelLog({
        vehicle_id: state.activeVehicleId,
        logged_at: String(formData.get("logged_at") || ""),
        odometer_km: Number(String(formData.get("odometer_km") || "").replace(",", ".")),
        total_cost: totalCost,
        price_per_liter: pricePerLiter,
        fuel_brand: String(formData.get("fuel_brand") || "Pertamax"),
        station_name: String(formData.get("station_name") || ""),
        is_full_tank: formData.get("is_full_tank") === "on",
        notes: String(formData.get("notes") || "")
      });

      form.reset();
      closeModal("modal-add-fuel");
      await loadActiveVehicleData();
      showToast("Catatan pengisian BBM berhasil disimpan.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan catatan BBM.";
      setModalError("modal-add-fuel", msg);
      showToast(msg, "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  qs("#form-add-maint")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setModalError("modal-add-maint", "");
    const form = /** @type {HTMLFormElement} */ (event.target);
    const submitBtn = /** @type {HTMLButtonElement | null} */ (qs("#btn-submit-maint"));
    setButtonLoading(submitBtn, true);

    try {
      const formData = new FormData(form);
      const nextDueRaw = String(formData.get("next_due_km") || "").trim();

      await createMaintenanceLog({
        vehicle_id: state.activeVehicleId,
        logged_at: String(formData.get("logged_at") || ""),
        odometer_km: Number(String(formData.get("odometer_km") || "").replace(",", ".")),
        category: /** @type {import("../types.js").MaintenanceLog["category"]} */ (
          String(formData.get("category") || "other")
        ),
        title: String(formData.get("title") || ""),
        workshop_name: String(formData.get("workshop_name") || ""),
        total_cost: Number(String(formData.get("total_cost") || "0").replace(",", ".")),
        next_due_km: nextDueRaw ? Number(nextDueRaw.replace(",", ".")) : null,
        notes: String(formData.get("notes") || "")
      });

      form.reset();
      closeModal("modal-add-maint");
      await loadActiveVehicleData();
      showToast("Catatan servis berhasil disimpan.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan catatan servis.";
      setModalError("modal-add-maint", msg);
      showToast(msg, "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

function handleUrlAuthErrors() {
  const hash = window.location.hash || "";
  if (!hash.includes("error=")) return;

  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const errorCode = params.get("error_code") || "";
  const errorDesc = params.get("error_description") || "";

  window.history.replaceState(null, "", window.location.pathname + window.location.search);

  if (errorCode === "otp_expired" || errorDesc.toLowerCase().includes("expired")) {
    showToast(
      "Tautan verifikasi/reset email sudah kedaluwarsa atau telah digunakan.",
      "error"
    );
  } else if (errorDesc) {
    showToast(decodeURIComponent(errorDesc.replace(/\+/g, " ")), "error");
  }
}

async function initDashboard() {
  handleUrlAuthErrors();
  try {
    const user = await requireAuth("./login.html");
    const userEmailEl = qs("#user-email");
    if (userEmailEl) userEmailEl.textContent = user.email || "";

    bindDashboardEvents();

    const [vehicles, fuelPrices] = await Promise.all([listVehicles(), listFuelPrices()]);
    state.vehicles = vehicles;
    state.fuelPrices = fuelPrices;

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