import { requireAuth, signOut } from "../services/auth-service.js";
import {
  DEFAULT_FUEL_PRICES,
  deleteFuelLog,
  deleteMaintenanceLog,
  listFuelLogs,
  listFuelPrices,
  listMaintenanceLogs,
  listVehicles,
  updateFuelLog,
  updateMaintenanceLog
} from "../services/vehicle-service.js";
import {
  MAINTENANCE_CATEGORIES,
  calculateFuelEfficiencySeries,
  calculateLitersFromCost,
  detectOdometerAnomaly,
  formatDateID,
  formatIDR,
  formatLiters,
  formatNumber
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
  maintenanceLogs: [],
  /** @type {'all' | 'fuel' | 'maintenance'} */
  filterType: "all",
  searchQuery: ""
};

function getAllVehicleLogs() {
  return [...state.fuelLogs, ...state.maintenanceLogs];
}

/**
 * Updates the non-blocking odometer warning banner inside an edit modal.
 * @param {string} modalId
 * @param {number} odometerKm
 * @param {string} loggedAt
 * @param {string | null} excludeId
 */
function refreshModalOdometerWarning(modalId, odometerKm, loggedAt, excludeId) {
  const modalEl = qs(`#${modalId}`);
  const warningEl = modalEl?.querySelector("[data-odo-warning]");
  if (!warningEl) return;

  const warningText = detectOdometerAnomaly(
    getAllVehicleLogs(),
    odometerKm,
    loggedAt,
    excludeId
  );
  if (warningText) {
    warningEl.textContent = warningText;
    warningEl.classList.remove("hidden");
  } else {
    warningEl.textContent = "";
    warningEl.classList.add("hidden");
  }
}

/**
 * Populates the edit fuel brand selector while preserving any custom brand already saved on the log.
 * @param {string} currentBrand
 */
function populateEditFuelBrandSelect(currentBrand) {
  const select = /** @type {HTMLSelectElement | null} */ (qs("#edit-fuel-brand"));
  if (!select) return;

  /** @type {Map<string, import("../types.js").FuelPriceOption[]>} */
  const grouped = new Map();
  for (const item of state.fuelPrices) {
    const list = grouped.get(item.brand) || [];
    list.push(item);
    grouped.set(item.brand, list);
  }

  const targetLower = String(currentBrand || "").trim().toLowerCase();
  let matched = false;

  const groupsHtml = [...grouped.entries()]
    .map(([brand, items]) => {
      const optionsHtml = items
        .map((item) => {
          const isSelected = item.product_name.toLowerCase() === targetLower;
          if (isSelected) matched = true;
          return `<option value="${escapeHtml(item.product_name)}" ${
            isSelected ? "selected" : ""
          }>${escapeHtml(item.product_name)}</option>`;
        })
        .join("");
      return `<optgroup label="${escapeHtml(brand)}">${optionsHtml}</optgroup>`;
    })
    .join("");

  if (!matched && currentBrand) {
    select.innerHTML =
      `<option value="${escapeHtml(currentBrand)}" selected>${escapeHtml(
        currentBrand
      )}</option>` + groupsHtml;
  } else {
    select.innerHTML = groupsHtml;
  }
}

function updateEditFuelLitersPreview() {
  const totalInput = /** @type {HTMLInputElement | null} */ (qs("#edit-fuel-total"));
  const priceInput = /** @type {HTMLInputElement | null} */ (qs("#edit-fuel-price"));
  const previewEl = qs("#edit-fuel-liters-preview");
  if (!previewEl) return;

  const totalCost = Number(String(totalInput?.value || "").replace(",", "."));
  const pricePerLiter = Number(String(priceInput?.value || "").replace(",", "."));
  const liters = calculateLitersFromCost(totalCost, pricePerLiter);
  previewEl.textContent = liters > 0 ? formatLiters(liters) : "0,00 L";
}

function openEditFuelModal(logId) {
  const log = state.fuelLogs.find((item) => item.id === logId);
  if (!log) return;

  setModalError("modal-edit-fuel", "");
  /** @type {HTMLInputElement | null} */ (qs("#edit-fuel-id")).value = log.id;
  /** @type {HTMLInputElement | null} */ (qs("#edit-fuel-date")).value = log.logged_at;
  /** @type {HTMLInputElement | null} */ (qs("#edit-fuel-odometer")).value = String(
    log.odometer_km
  );
  /** @type {HTMLInputElement | null} */ (qs("#edit-fuel-total")).value = String(log.total_cost);
  /** @type {HTMLInputElement | null} */ (qs("#edit-fuel-price")).value = String(
    log.price_per_liter
  );
  /** @type {HTMLInputElement | null} */ (qs("#edit-fuel-station")).value =
    log.station_name || "";
  /** @type {HTMLInputElement | null} */ (qs("#edit-fuel-notes")).value = log.notes || "";
  /** @type {HTMLInputElement | null} */ (qs("#edit-fuel-full-tank")).checked =
    log.is_full_tank !== false;

  populateEditFuelBrandSelect(log.fuel_brand || "Pertamax");
  updateEditFuelLitersPreview();
  refreshModalOdometerWarning(
    "modal-edit-fuel",
    Number(log.odometer_km),
    log.logged_at,
    log.id
  );
  openModal("modal-edit-fuel");
}

function openEditMaintModal(logId) {
  const log = state.maintenanceLogs.find((item) => item.id === logId);
  if (!log) return;

  setModalError("modal-edit-maint", "");
  /** @type {HTMLInputElement | null} */ (qs("#edit-maint-id")).value = log.id;
  /** @type {HTMLInputElement | null} */ (qs("#edit-maint-date")).value = log.logged_at;
  /** @type {HTMLInputElement | null} */ (qs("#edit-maint-odometer")).value = String(
    log.odometer_km
  );
  /** @type {HTMLSelectElement | null} */ (qs("#edit-maint-category")).value =
    log.category || "other";
  /** @type {HTMLInputElement | null} */ (qs("#edit-maint-title")).value = log.title || "";
  /** @type {HTMLInputElement | null} */ (qs("#edit-maint-cost")).value = String(
    log.total_cost
  );
  /** @type {HTMLInputElement | null} */ (qs("#edit-maint-next-due")).value =
    log.next_due_km !== null && log.next_due_km !== undefined ? String(log.next_due_km) : "";
  /** @type {HTMLInputElement | null} */ (qs("#edit-maint-workshop")).value =
    log.workshop_name || "";
  /** @type {HTMLInputElement | null} */ (qs("#edit-maint-notes")).value = log.notes || "";

  refreshModalOdometerWarning(
    "modal-edit-maint",
    Number(log.odometer_km),
    log.logged_at,
    log.id
  );
  openModal("modal-edit-maint");
}

function getFilteredUnifiedRows() {
  const efficiencyMap = new Map(
    calculateFuelEfficiencySeries(state.fuelLogs).map((pt) => [pt.id, pt.km_per_liter])
  );

  const fuelRows = state.fuelLogs.map((f) => ({
    id: f.id,
    kind: /** @type {const} */ ("fuel"),
    logged_at: f.logged_at,
    odometer_km: Number(f.odometer_km),
    title: `${f.fuel_brand || "BBM"} (${formatLiters(f.liters)} @ ${formatIDR(
      f.price_per_liter
    )})`,
    meta: [
      f.station_name,
      f.is_full_tank ? "Full Tank" : "Parsial",
      efficiencyMap.has(f.id) ? `${formatNumber(efficiencyMap.get(f.id), 2)} km/L` : null
    ]
      .filter(Boolean)
      .join(" • "),
    notes: f.notes || "",
    total_cost: Number(f.total_cost)
  }));

  const maintRows = state.maintenanceLogs.map((m) => ({
    id: m.id,
    kind: /** @type {const} */ ("maintenance"),
    logged_at: m.logged_at,
    odometer_km: Number(m.odometer_km),
    title: m.title,
    meta: [
      MAINTENANCE_CATEGORIES[m.category] || m.category,
      m.workshop_name,
      m.next_due_km ? `Next: ${formatNumber(m.next_due_km, 0)} km` : null
    ]
      .filter(Boolean)
      .join(" • "),
    notes: m.notes || "",
    total_cost: Number(m.total_cost)
  }));

  let merged = [...fuelRows, ...maintRows];
  if (state.filterType !== "all") {
    merged = merged.filter((r) => r.kind === state.filterType);
  }

  const q = state.searchQuery.trim().toLowerCase();
  if (q) {
    merged = merged.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.meta.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q) ||
        r.logged_at.includes(q)
    );
  }

  return merged.sort((a, b) => {
    const d = String(b.logged_at).localeCompare(String(a.logged_at));
    if (d !== 0) return d;
    return b.odometer_km - a.odometer_km;
  });
}

function renderLogbookTable() {
  const tbody = qs("#logbook-table-body");
  const countEl = qs("#logbook-count");
  if (!tbody) return;

  const rows = getFilteredUnifiedRows();
  if (countEl) countEl.textContent = `${rows.length} catatan`;

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-10 text-center text-sm text-slate-500">
          Tidak ada catatan yang cocok dengan filter saat ini.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows
    .map((row) => {
      const badgeClass =
        row.kind === "fuel"
          ? "bg-sky-100 text-sky-700"
          : "bg-amber-100 text-amber-700";
      const badgeLabel = row.kind === "fuel" ? "BBM" : "Servis";

      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/80">
          <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
            <div class="font-medium text-slate-900">${escapeHtml(formatDateID(row.logged_at))}</div>
            <div class="text-xs text-slate-500">${formatNumber(row.odometer_km, 0)} km</div>
          </td>
          <td class="px-4 py-3">
            <span class="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${badgeClass}">
              ${badgeLabel}
            </span>
          </td>
          <td class="px-4 py-3">
            <div class="text-sm font-semibold text-slate-900">${escapeHtml(row.title)}</div>
            <div class="text-xs text-slate-500">${escapeHtml(row.meta)}</div>
            ${
              row.notes
                ? `<div class="mt-0.5 text-xs italic text-slate-400">${escapeHtml(row.notes)}</div>`
                : ""
            }
          </td>
          <td class="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-900">
            ${escapeHtml(formatIDR(row.total_cost))}
          </td>
          <td class="whitespace-nowrap px-4 py-3 text-right">
            <div class="inline-flex items-center gap-1.5">
              <button
                type="button"
                data-edit-kind="${row.kind}"
                data-edit-id="${escapeHtml(row.id)}"
                class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                data-delete-kind="${row.kind}"
                data-delete-id="${escapeHtml(row.id)}"
                class="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                Hapus
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function exportFilteredCsv() {
  const rows = getFilteredUnifiedRows();
  if (!rows.length) {
    showToast("Tidak ada data untuk diekspor.", "info");
    return;
  }

  const header = ["Tanggal", "Tipe", "Odometer_KM", "Deskripsi", "Detail", "Biaya_IDR", "Catatan"];
  const escapeCsv = (val) => `"${String(val ?? "").replaceAll('"', '""')}"`;

  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.logged_at,
        r.kind === "fuel" ? "BBM" : "Servis",
        r.odometer_km,
        r.title,
        r.meta,
        r.total_cost,
        r.notes
      ]
        .map(escapeCsv)
        .join(",")
    )
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vehicle-logbook-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("File CSV berhasil diunduh.", "success");
}

async function loadVehicleLogs() {
  if (!state.activeVehicleId) {
    state.fuelLogs = [];
    state.maintenanceLogs = [];
    renderLogbookTable();
    return;
  }
  localStorage.setItem(STORAGE_VEHICLE_KEY, state.activeVehicleId);
  const [fuelLogs, maintenanceLogs] = await Promise.all([
    listFuelLogs(state.activeVehicleId),
    listMaintenanceLogs(state.activeVehicleId)
  ]);
  state.fuelLogs = fuelLogs;
  state.maintenanceLogs = maintenanceLogs;
  renderLogbookTable();
}

function bindEditForms() {
  const editFuelTotal = qs("#edit-fuel-total");
  const editFuelPrice = qs("#edit-fuel-price");
  editFuelTotal?.addEventListener("input", updateEditFuelLitersPreview);
  editFuelPrice?.addEventListener("input", updateEditFuelLitersPreview);

  const editFuelOdo = /** @type {HTMLInputElement | null} */ (qs("#edit-fuel-odometer"));
  const editFuelDate = /** @type {HTMLInputElement | null} */ (qs("#edit-fuel-date"));
  const editFuelId = /** @type {HTMLInputElement | null} */ (qs("#edit-fuel-id"));
  const onFuelOdoChange = () => {
    refreshModalOdometerWarning(
      "modal-edit-fuel",
      Number(String(editFuelOdo?.value || "0").replace(",", ".")),
      editFuelDate?.value || "",
      editFuelId?.value || null
    );
  };
  editFuelOdo?.addEventListener("input", onFuelOdoChange);
  editFuelDate?.addEventListener("change", onFuelOdoChange);

  const editMaintOdo = /** @type {HTMLInputElement | null} */ (qs("#edit-maint-odometer"));
  const editMaintDate = /** @type {HTMLInputElement | null} */ (qs("#edit-maint-date"));
  const editMaintId = /** @type {HTMLInputElement | null} */ (qs("#edit-maint-id"));
  const onMaintOdoChange = () => {
    refreshModalOdometerWarning(
      "modal-edit-maint",
      Number(String(editMaintOdo?.value || "0").replace(",", ".")),
      editMaintDate?.value || "",
      editMaintId?.value || null
    );
  };
  editMaintOdo?.addEventListener("input", onMaintOdoChange);
  editMaintDate?.addEventListener("change", onMaintOdoChange);

  qs("#form-edit-fuel")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setModalError("modal-edit-fuel", "");
    const form = /** @type {HTMLFormElement} */ (event.target);
    const submitBtn = /** @type {HTMLButtonElement | null} */ (qs("#btn-submit-edit-fuel"));
    setButtonLoading(submitBtn, true);

    try {
      const formData = new FormData(form);
      const logId = String(formData.get("id") || "");
      const totalCost = Number(String(formData.get("total_cost") || "").replace(",", "."));
      const pricePerLiter = Number(
        String(formData.get("price_per_liter") || "").replace(",", ".")
      );
      const calculatedLiters = calculateLitersFromCost(totalCost, pricePerLiter);

      await updateFuelLog(logId, {
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

      await loadVehicleLogs();
      closeModal("modal-edit-fuel");
      showToast("Catatan BBM berhasil diperbarui.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui catatan BBM.";
      setModalError("modal-edit-fuel", msg);
      showToast(msg, "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  qs("#form-edit-maint")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setModalError("modal-edit-maint", "");
    const form = /** @type {HTMLFormElement} */ (event.target);
    const submitBtn = /** @type {HTMLButtonElement | null} */ (qs("#btn-submit-edit-maint"));
    setButtonLoading(submitBtn, true);

    try {
      const formData = new FormData(form);
      const logId = String(formData.get("id") || "");
      const nextDueRaw = String(formData.get("next_due_km") || "").trim();

      await updateMaintenanceLog(logId, {
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

      await loadVehicleLogs();
      closeModal("modal-edit-maint");
      showToast("Catatan servis berhasil diperbarui.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui catatan servis.";
      setModalError("modal-edit-maint", msg);
      showToast(msg, "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

function bindLogbookEvents() {
  bindModalDismissHandlers();
  bindEditForms();

  qs("#btn-signout")?.addEventListener("click", async () => {
    await signOut("./login.html");
  });

  qs("#vehicle-selector")?.addEventListener("change", async (event) => {
    const select = /** @type {HTMLSelectElement} */ (event.target);
    state.activeVehicleId = select.value;
    await loadVehicleLogs();
  });

  document.querySelectorAll("[data-filter-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const kind = /** @type {'all'|'fuel'|'maintenance'} */ (
        btn.getAttribute("data-filter-type") || "all"
      );
      state.filterType = kind;
      document.querySelectorAll("[data-filter-type]").forEach((el) => {
        el.classList.remove("bg-slate-900", "text-white");
        el.classList.add("bg-white", "text-slate-700");
      });
      btn.classList.remove("bg-white", "text-slate-700");
      btn.classList.add("bg-slate-900", "text-white");
      renderLogbookTable();
    });
  });

  qs("#logbook-search")?.addEventListener("input", (event) => {
    const input = /** @type {HTMLInputElement} */ (event.target);
    state.searchQuery = input.value;
    renderLogbookTable();
  });

  qs("#btn-export-csv")?.addEventListener("click", exportFilteredCsv);

  qs("#logbook-table-body")?.addEventListener("click", async (event) => {
    const target = /** @type {HTMLElement} */ (event.target);

    const editBtn = target.closest("[data-edit-id]");
    if (editBtn) {
      const editId = editBtn.getAttribute("data-edit-id");
      const editKind = editBtn.getAttribute("data-edit-kind");
      if (!editId || !editKind) return;
      if (editKind === "fuel") {
        openEditFuelModal(editId);
      } else {
        openEditMaintModal(editId);
      }
      return;
    }

    const deleteBtn = target.closest("[data-delete-id]");
    if (!deleteBtn) return;

    const id = deleteBtn.getAttribute("data-delete-id");
    const kind = deleteBtn.getAttribute("data-delete-kind");
    if (!id || !kind) return;

    if (!window.confirm("Yakin ingin menghapus catatan ini secara permanen?")) return;

    try {
      if (kind === "fuel") {
        await deleteFuelLog(id);
      } else {
        await deleteMaintenanceLog(id);
      }
      await loadVehicleLogs();
      showToast("Catatan berhasil dihapus.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menghapus catatan.", "error");
    }
  });
}

async function initLogbookPage() {
  try {
    const user = await requireAuth("./login.html");
    const userEmailEl = qs("#user-email");
    if (userEmailEl) userEmailEl.textContent = user.email || "";

    bindLogbookEvents();

    const [vehicles, fuelPrices] = await Promise.all([listVehicles(), listFuelPrices()]);
    state.vehicles = vehicles;
    state.fuelPrices = fuelPrices;

    const select = /** @type {HTMLSelectElement | null} */ (qs("#vehicle-selector"));
    const savedId = localStorage.getItem(STORAGE_VEHICLE_KEY) || "";
    if (savedId && state.vehicles.some((v) => v.id === savedId)) {
      state.activeVehicleId = savedId;
    } else if (state.vehicles.length > 0) {
      state.activeVehicleId = state.vehicles[0].id;
    }

    if (select) {
      select.innerHTML =
        state.vehicles.length > 0
          ? state.vehicles
              .map((v) => {
                const label = v.plate_number ? `${v.name} (${v.plate_number})` : v.name;
                const sel = v.id === state.activeVehicleId ? "selected" : "";
                return `<option value="${escapeHtml(v.id)}" ${sel}>${escapeHtml(label)}</option>`;
              })
              .join("")
          : `<option value="">Belum ada kendaraan</option>`;
    }

    await loadVehicleLogs();
  } catch (err) {
    if (err instanceof Error && err.message === "AUTH_REDIRECT") return;
    showToast(err instanceof Error ? err.message : "Gagal memuat riwayat.", "error");
  }
}

document.addEventListener("DOMContentLoaded", initLogbookPage);