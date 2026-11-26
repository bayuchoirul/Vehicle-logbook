import {
  ensureDefaultVehicle,
  createVehicle,
  listFuelLogs,
  createFuelLog,
  deleteFuelLog,
  listMaintenanceLogs,
  createMaintenanceLog,
  deleteMaintenanceLog,
  listComponentSchedules,
  createComponentSchedule,
  resetComponentSchedule,
  deleteComponentSchedule,
} from "../services/vehicle-service.js";
import { requireAuth, signOut } from "../services/auth-service.js";
import {
  calculateVehicleSummary,
  calculateTankFillPercent,
  evaluateComponentStatus,
} from "../utils/metrics.js";

const LOGIN_ROUTE = "/login.html";

function formatCurrencyIdr(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(amount || 0)));
}

function formatNumberId(value, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0.0";
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function todayIsoDate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export class VehicleLogbookApp {
  constructor(root = document) {
    this.root = root;
    this.state = {
      vehicles: [],
      selectedVehicleId: null,
      fuelLogs: [],
      maintenanceLogs: [],
      componentSchedules: [],
      activeTab: "fuel",
      currentOdometerKm: 0,
    };
  }

  async init() {
    this.bindEvents();
    this.setDefaultFormDates();

    try {
      const session = await requireAuth(LOGIN_ROUTE);
      if (!session) return;

      this.showBanner("Memuat data kendaraan dari Supabase...", "info");
      const vehicles = await ensureDefaultVehicle();
      this.state.vehicles = vehicles;
      this.state.selectedVehicleId = vehicles[0].id;

      this.renderVehicleSelector();
      await this.refreshVehicleData();
      this.clearBanner();
    } catch (err) {
      this.showBanner(err.message || "Gagal menghubungkan ke Supabase.", "error");
    }
  }

  setDefaultFormDates() {
    const today = todayIsoDate();
    const fuelDate = this.root.querySelector("#fuelDate");
    const maintDate = this.root.querySelector("#maintDate");
    if (fuelDate && !fuelDate.value) fuelDate.value = today;
    if (maintDate && !maintDate.value) maintDate.value = today;
  }

  bindEvents() {
    // Tab navigation
    this.root.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // Vehicle switcher
    const vehicleSelect = this.root.querySelector("#vehicleSelect");
    if (vehicleSelect) {
      vehicleSelect.addEventListener("change", async (event) => {
        if (event.target.value === "__ADD_NEW__") {
          await this.handleQuickAddVehicle();
          return;
        }
        this.state.selectedVehicleId = event.target.value;
        await this.refreshVehicleData();
      });
    }

    // Sign out
    const signOutBtn = this.root.querySelector("#signOutBtn");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", async () => {
        try {
          await signOut(LOGIN_ROUTE);
        } catch (err) {
          this.showBanner(err.message || "Gagal keluar dari sesi.", "error");
        }
      });
    }

    // Fuel form submit
    const fuelForm = this.root.querySelector("#fuelLogForm");
    if (fuelForm) {
      fuelForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.handleFuelSubmit(fuelForm);
      });
    }

    // Maintenance form submit
    const maintForm = this.root.querySelector("#maintenanceLogForm");
    if (maintForm) {
      maintForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.handleMaintenanceSubmit(maintForm);
      });
    }

    // Component schedule form submit
    const compForm = this.root.querySelector("#componentForm");
    if (compForm) {
      compForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.handleComponentSubmit(compForm);
      });
    }

    // Delete fuel log
    const fuelTbody = this.root.querySelector("#fuelLogsTbody");
    if (fuelTbody) {
      fuelTbody.addEventListener("click", async (event) => {
        const delBtn = event.target.closest("[data-delete-fuel]");
        if (!delBtn) return;
        await this.handleDeleteFuel(delBtn.dataset.deleteFuel);
      });
    }

    // Delete maintenance log
    const maintTbody = this.root.querySelector("#maintenanceLogsTbody");
    if (maintTbody) {
      maintTbody.addEventListener("click", async (event) => {
        const delBtn = event.target.closest("[data-delete-maint]");
        if (!delBtn) return;
        await this.handleDeleteMaintenance(delBtn.dataset.deleteMaint);
      });
    }

    // Reset or delete component schedule
    const compTbody = this.root.querySelector("#componentSchedulesTbody");
    if (compTbody) {
      compTbody.addEventListener("click", async (event) => {
        const resetBtn = event.target.closest("[data-reset-comp]");
        if (resetBtn) {
          await this.handleResetComponent(resetBtn.dataset.resetComp);
          return;
        }
        const delBtn = event.target.closest("[data-delete-comp]");
        if (delBtn) {
          await this.handleDeleteComponent(delBtn.dataset.deleteComp);
        }
      });
    }
  }

  showBanner(message, type = "info") {
    const banner = this.root.querySelector("#appStatusBanner");
    if (!banner) return;
    banner.textContent = message;
    banner.classList.remove("hidden");

    if (type === "error") {
      banner.className =
        "mb-5 rounded-xl border border-rose-500/40 bg-rose-950/70 px-4 py-3 text-sm text-rose-200";
    } else if (type === "success") {
      banner.className =
        "mb-5 rounded-xl border border-emerald-500/40 bg-emerald-950/70 px-4 py-3 text-sm text-emerald-200";
    } else {
      banner.className =
        "mb-5 rounded-xl border border-sky-500/40 bg-sky-950/70 px-4 py-3 text-sm text-sky-200";
    }
  }

  clearBanner() {
    const banner = this.root.querySelector("#appStatusBanner");
    if (!banner) return;
    banner.textContent = "";
    banner.classList.add("hidden");
  }

  switchTab(tabName) {
    this.state.activeTab = tabName;

    this.root.querySelectorAll("[data-tab]").forEach((btn) => {
      const isActive = btn.dataset.tab === tabName;
      btn.className = isActive
        ? "flex-1 rounded-xl bg-pink-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition"
        : "flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-medium text-slate-300 hover:bg-slate-800/70 hover:text-white transition";
    });

    const panels = {
      fuel: this.root.querySelector("#panelFuel"),
      maintenance: this.root.querySelector("#panelMaintenance"),
      components: this.root.querySelector("#panelComponents"),
    };

    Object.entries(panels).forEach(([key, el]) => {
      if (el) el.classList.toggle("hidden", key !== tabName);
    });
  }

  renderVehicleSelector() {
    const select = this.root.querySelector("#vehicleSelect");
    if (!select) return;

    const options = this.state.vehicles
      .map(
        (v) =>
          `<option value="${escapeHtml(v.id)}" ${
            v.id === this.state.selectedVehicleId ? "selected" : ""
          }>${escapeHtml(v.name)} (${escapeHtml(v.tank_capacity_liters ?? 3.7)} L)</option>`
      )
      .join("");

    select.innerHTML = `${options}<option value="__ADD_NEW__">+ Tambah Kendaraan Baru...</option>`;
  }

  async handleQuickAddVehicle() {
    const name = window.prompt("Nama kendaraan baru:", "Honda Vario 110 eSP");
    if (!name) {
      this.renderVehicleSelector();
      return;
    }
    const tankStr = window.prompt("Kapasitas tangki (liter):", "3.7");
    const tankCap = Number(tankStr) > 0 ? Number(tankStr) : 3.7;

    try {
      this.showBanner("Menambahkan unit kendaraan baru...", "info");
      const created = await createVehicle({
        name,
        model: name,
        fuel_type: "Pertamax",
        tank_capacity_liters: tankCap,
        initial_odometer_km: 0,
      });
      this.state.vehicles.push(created);
      this.state.selectedVehicleId = created.id;
      this.renderVehicleSelector();
      await this.refreshVehicleData();
      this.showBanner(`Unit "${created.name}" berhasil ditambahkan.`, "success");
    } catch (err) {
      this.showBanner(err.message || "Gagal menambahkan kendaraan.", "error");
      this.renderVehicleSelector();
    }
  }

  async refreshVehicleData() {
    if (!this.state.selectedVehicleId) return;

    const [fuelLogs, maintenanceLogs, componentSchedules] = await Promise.all([
      listFuelLogs(this.state.selectedVehicleId),
      listMaintenanceLogs(this.state.selectedVehicleId),
      listComponentSchedules(this.state.selectedVehicleId),
    ]);

    this.state.fuelLogs = fuelLogs;
    this.state.maintenanceLogs = maintenanceLogs;
    this.state.componentSchedules = componentSchedules;

    this.renderSummaryCards();
    this.renderFuelTable();
    this.renderMaintenanceTable();
    this.renderComponentTable();
  }

  renderSummaryCards() {
    const vehicle =
      this.state.vehicles.find((v) => v.id === this.state.selectedVehicleId) ||
      this.state.vehicles[0];

    const summary = calculateVehicleSummary(
      vehicle,
      this.state.fuelLogs,
      this.state.maintenanceLogs
    );
    this.state.currentOdometerKm = summary.currentOdometerKm;

    const setText = (selector, text) => {
      const el = this.root.querySelector(selector);
      if (el) el.textContent = text;
    };

    setText("#cardOdometerValue", `${formatNumberId(summary.currentOdometerKm, 0)} km`);
    setText(
      "#cardConsumptionValue",
      summary.averageKmPerLiter !== null ? `${formatNumberId(summary.averageKmPerLiter, 1)} km/L` : "0.0 km/L"
    );
    setText("#cardFuelCostValue", formatCurrencyIdr(summary.totalFuelCost));
    setText("#cardMaintCostValue", formatCurrencyIdr(summary.totalMaintenanceCost));
  }

  async handleFuelSubmit(formEl) {
    const submitBtn = formEl.querySelector('button[type="submit"]');
    try {
      if (!this.state.selectedVehicleId) {
        const vehicles = await ensureDefaultVehicle();
        this.state.vehicles = vehicles;
        this.state.selectedVehicleId = vehicles[0].id;
        this.renderVehicleSelector();
      }

      const formData = new FormData(formEl);
      const loggedAt = String(formData.get("logged_at") || "").trim();
      const odometerKm = Number(formData.get("odometer_km"));
      const liters = Number(formData.get("liters"));
      const pricePerLiter = Number(formData.get("price_per_liter"));
      const fuelType = String(formData.get("fuel_type") || "Pertamax").trim();
      const stationName = String(formData.get("station_name") || "").trim();
      const isFullTank = formData.get("is_full_tank") === "on";

      if (!loggedAt) throw new Error("Tanggal pengisian wajib diisi.");
      if (!Number.isFinite(odometerKm) || odometerKm <= 0) {
        throw new Error("Odometer (km) harus diisi angka lebih dari 0.");
      }
      if (!Number.isFinite(liters) || liters <= 0) {
        throw new Error("Volume (Liter) harus diisi angka lebih dari 0.");
      }
      if (!Number.isFinite(pricePerLiter) || pricePerLiter <= 0) {
        throw new Error("Harga / Liter (IDR) harus diisi angka lebih dari 0.");
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Menyimpan...";
      }

      const totalCost = Math.round(liters * pricePerLiter);

      await createFuelLog({
        vehicle_id: this.state.selectedVehicleId,
        logged_at: loggedAt,
        odometer_km: odometerKm,
        liters,
        price_per_liter: pricePerLiter,
        total_cost: totalCost,
        fuel_type: fuelType,
        is_full_tank: isFullTank,
        station_name: stationName,
      });

      formEl.reset();
      this.setDefaultFormDates();
      const fuelTypeSelect = formEl.querySelector('[name="fuel_type"]');
      if (fuelTypeSelect) fuelTypeSelect.value = fuelType;
      const fullTankCheckbox = formEl.querySelector('[name="is_full_tank"]');
      if (fullTankCheckbox) fullTankCheckbox.checked = true;

      await this.refreshVehicleData();
      this.showBanner(
        `Log BBM ${fuelType} (${liters} L — ${formatCurrencyIdr(totalCost)}) berhasil disimpan.`,
        "success"
      );
    } catch (err) {
      this.showBanner(err.message || "Gagal menyimpan log BBM.", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Simpan Log BBM";
      }
    }
  }

  async handleMaintenanceSubmit(formEl) {
    const submitBtn = formEl.querySelector('button[type="submit"]');
    try {
      const formData = new FormData(formEl);
      const serviceDate = String(formData.get("service_date") || "").trim();
      const odometerKm = Number(formData.get("odometer_km"));
      const serviceType = String(formData.get("service_type") || "").trim();
      const cost = Number(formData.get("cost") || 0);
      const workshopName = String(formData.get("workshop_name") || "").trim();
      const notes = String(formData.get("notes") || "").trim();

      if (!serviceDate || !serviceType || !Number.isFinite(odometerKm) || odometerKm <= 0) {
        throw new Error("Tanggal, Odometer, dan Jenis Servis wajib diisi dengan benar.");
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Menyimpan...";
      }

      await createMaintenanceLog({
        vehicle_id: this.state.selectedVehicleId,
        service_date: serviceDate,
        odometer_km: odometerKm,
        service_type: serviceType,
        cost,
        workshop_name: workshopName,
        notes,
      });

      formEl.reset();
      this.setDefaultFormDates();
      await this.refreshVehicleData();
      this.showBanner(`Riwayat servis "${serviceType}" berhasil disimpan.`, "success");
    } catch (err) {
      this.showBanner(err.message || "Gagal menyimpan log servis.", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Simpan Log Servis";
      }
    }
  }

  async handleComponentSubmit(formEl) {
    const submitBtn = formEl.querySelector('button[type="submit"]');
    try {
      const formData = new FormData(formEl);
      const componentName = String(formData.get("component_name") || "").trim();
      const lastReplacedKm = Number(formData.get("last_replaced_km") || 0);
      const intervalKm = Number(formData.get("interval_km") || 2000);
      const notes = String(formData.get("notes") || "").trim();

      if (!componentName || intervalKm <= 0) {
        throw new Error("Nama komponen dan interval kilometer wajib diisi.");
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Menyimpan...";
      }

      await createComponentSchedule({
        vehicle_id: this.state.selectedVehicleId,
        component_name: componentName,
        last_replaced_km: lastReplacedKm,
        interval_km: intervalKm,
        notes,
      });

      formEl.reset();
      await this.refreshVehicleData();
      this.showBanner(`Jadwal komponen "${componentName}" berhasil ditambahkan.`, "success");
    } catch (err) {
      this.showBanner(err.message || "Gagal menyimpan jadwal komponen.", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Tambah Jadwal Komponen";
      }
    }
  }

  async handleDeleteFuel(logId) {
    try {
      await deleteFuelLog(logId);
      await this.refreshVehicleData();
      this.showBanner("Log BBM berhasil dihapus.", "success");
    } catch (err) {
      this.showBanner(err.message || "Gagal menghapus log BBM.", "error");
    }
  }

  async handleDeleteMaintenance(logId) {
    try {
      await deleteMaintenanceLog(logId);
      await this.refreshVehicleData();
      this.showBanner("Log servis berhasil dihapus.", "success");
    } catch (err) {
      this.showBanner(err.message || "Gagal menghapus log servis.", "error");
    }
  }

  async handleResetComponent(scheduleId) {
    try {
      await resetComponentSchedule(scheduleId, this.state.currentOdometerKm);
      await this.refreshVehicleData();
      this.showBanner(
        `Komponen di-reset ke odometer terkini (${this.state.currentOdometerKm} km).`,
        "success"
      );
    } catch (err) {
      this.showBanner(err.message || "Gagal mereset komponen.", "error");
    }
  }

  async handleDeleteComponent(scheduleId) {
    try {
      await deleteComponentSchedule(scheduleId);
      await this.refreshVehicleData();
      this.showBanner("Jadwal komponen dihapus.", "success");
    } catch (err) {
      this.showBanner(err.message || "Gagal menghapus jadwal komponen.", "error");
    }
  }

  renderFuelTable() {
    const tbody = this.root.querySelector("#fuelLogsTbody");
    if (!tbody) return;

    const vehicle = this.state.vehicles.find((v) => v.id === this.state.selectedVehicleId);
    const tankCap = vehicle?.tank_capacity_liters ?? 3.7;

    if (!this.state.fuelLogs.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-6 text-center text-sm text-slate-400">Belum ada catatan pengisian BBM.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.fuelLogs
      .map((row) => {
        const fillPct = calculateTankFillPercent(row.liters, tankCap);
        return `
          <tr class="hover:bg-slate-800/40">
            <td class="whitespace-nowrap px-4 py-3 text-slate-200">${escapeHtml(row.logged_at)}</td>
            <td class="whitespace-nowrap px-4 py-3 font-medium text-white">${escapeHtml(row.odometer_km)} km</td>
            <td class="whitespace-nowrap px-4 py-3 text-slate-200">${escapeHtml(row.fuel_type || "Pertamax")}</td>
            <td class="whitespace-nowrap px-4 py-3 text-slate-200">${escapeHtml(row.liters)} L <span class="text-xs text-slate-400">(${fillPct}%)</span></td>
            <td class="whitespace-nowrap px-4 py-3 font-semibold text-pink-400">${formatCurrencyIdr(row.total_cost)}</td>
            <td class="px-4 py-3 text-slate-300">${escapeHtml(row.station_name || "-")}</td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <button type="button" data-delete-fuel="${escapeHtml(row.id)}" class="rounded-lg border border-rose-500/40 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-950/60">
                Hapus
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  renderMaintenanceTable() {
    const tbody = this.root.querySelector("#maintenanceLogsTbody");
    if (!tbody) return;

    if (!this.state.maintenanceLogs.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-slate-400">Belum ada riwayat servis.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.maintenanceLogs
      .map(
        (row) => `
          <tr class="hover:bg-slate-800/40">
            <td class="whitespace-nowrap px-4 py-3 text-slate-200">${escapeHtml(row.service_date)}</td>
            <td class="whitespace-nowrap px-4 py-3 font-medium text-white">${escapeHtml(row.odometer_km)} km</td>
            <td class="px-4 py-3 text-slate-200">${escapeHtml(row.service_type)}</td>
            <td class="whitespace-nowrap px-4 py-3 font-semibold text-pink-400">${formatCurrencyIdr(row.cost)}</td>
            <td class="px-4 py-3 text-slate-300">${escapeHtml(row.workshop_name || "-")}</td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <button type="button" data-delete-maint="${escapeHtml(row.id)}" class="rounded-lg border border-rose-500/40 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-950/60">
                Hapus
              </button>
            </td>
          </tr>
        `
      )
      .join("");
  }

  renderComponentTable() {
    const tbody = this.root.querySelector("#componentSchedulesTbody");
    if (!tbody) return;

    if (!this.state.componentSchedules.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-slate-400">Belum ada jadwal komponen. Tambahkan komponen seperti Oli Mesin (2.000 km) atau V-Belt (24.000 km).</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.componentSchedules
      .map((row) => {
        const evalResult = evaluateComponentStatus(row, this.state.currentOdometerKm);
        const badgeClass =
          evalResult.status === "DUE"
            ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
            : evalResult.status === "SOON"
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";

        return `
          <tr class="hover:bg-slate-800/40">
            <td class="px-4 py-3 font-medium text-white">${escapeHtml(row.component_name)}</td>
            <td class="whitespace-nowrap px-4 py-3 text-slate-300">${escapeHtml(row.last_replaced_km)} km</td>
            <td class="whitespace-nowrap px-4 py-3 text-slate-300">Setiap ${escapeHtml(row.interval_km)} km</td>
            <td class="whitespace-nowrap px-4 py-3 text-slate-200">${evalResult.nextDueKm} km</td>
            <td class="whitespace-nowrap px-4 py-3">
              <span class="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}">
                ${evalResult.remainingKm >= 0 ? `Sisa ${evalResult.remainingKm} km` : `Lewat ${Math.abs(evalResult.remainingKm)} km`}
              </span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-right space-x-2">
              <button type="button" data-reset-comp="${escapeHtml(row.id)}" class="rounded-lg border border-emerald-500/40 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-950/60">
                Reset Ganti
              </button>
              <button type="button" data-delete-comp="${escapeHtml(row.id)}" class="rounded-lg border border-rose-500/40 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-950/60">
                Hapus
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new VehicleLogbookApp(document);
  app.init();
});
