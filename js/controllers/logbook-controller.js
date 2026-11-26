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
  calculateFuelEfficiencySeries,
  formatDateID,
  formatIDR,
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
  /** @type {'all' | 'fuel' | 'maintenance'} */
  filterType: "all",
  searchQuery: ""
};

function getFilteredUnifiedRows() {
  const efficiencyMap = new Map(
    calculateFuelEfficiencySeries(state.fuelLogs).map((pt) => [pt.id, pt.km_per_liter])
  );

  const fuelRows = state.fuelLogs.map((f) => ({
    id: f.id,
    kind: /** @type {const} */ ("fuel"),
    logged_at: f.logged_at,
    odometer_km: Number(f.odometer_km),
    title: `${f.fuel_brand || "BBM"} (${formatNumber(f.liters, 3)} L @ ${formatIDR(
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
            <button
              type="button"
              data-delete-kind="${row.kind}"
              data-delete-id="${escapeHtml(row.id)}"
              class="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
            >
              Hapus
            </button>
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

function bindLogbookEvents() {
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

    state.vehicles = await listVehicles();
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