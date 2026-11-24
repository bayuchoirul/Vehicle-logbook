import { DEFAULT_TOKEN, PRESETS_BY_TYPE } from "./presets.js";
import { apiGetAll, apiPostAction } from "./api.js";
import {
  state,
  getConfig,
  persistLocal,
  getActiveMotor,
  getActiveMaster,
  getLatestOdometer,
  formatKm
} from "./store.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderHistory } from "./views/history.js";
import { renderProfile } from "./views/profile.js";

function renderAll() {
  const activeMotor = getActiveMotor();
  const mMaster = getActiveMaster();

  // Header Motor Dropdown
  const sel = document.getElementById("headerMotorSelect");
  sel.innerHTML = state.motors
    .map(
      (m) =>
        `<option value="${m.motor_id}" class="bg-slate-900 text-white" ${
          m.motor_id === activeMotor.motor_id ? "selected" : ""
        }>${m.nama_motor}</option>`
    )
    .join("");

  document.getElementById("activeMotorBadge").textContent =
    activeMotor.jenis_motor + (activeMotor.plat_nomor ? ` • ${activeMotor.plat_nomor}` : "");
  document.getElementById("compConfigMotorName").textContent = activeMotor.nama_motor;

  // Dropdown Komponen di Modal Catat
  const selectKomp = document.getElementById("inpKomponen");
  selectKomp.innerHTML = mMaster
    .map((c) => `<option value="${c.nama_komponen}">${c.nama_komponen}</option>`)
    .join("");

  renderDashboard();
  renderHistory();
  renderProfile();
}

async function fetchData(manual = false) {
  const cfg = getConfig();
  if (!cfg.url) return;

  const dot = document.getElementById("syncDot");
  const btn = document.getElementById("btnRefresh");
  dot.className = "w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0";
  btn.classList.add("opacity-50");

  try {
    const data = await apiGetAll();
    if (data.motors && data.motors.length > 0) {
      state.motors = data.motors.map((m) => ({
        ...m,
        aktif: m.aktif === true || m.aktif === "TRUE"
      }));
      const dbActive = state.motors.find((m) => m.aktif);
      if (!state.motors.some((m) => m.motor_id === state.activeMotorId)) {
        state.activeMotorId = dbActive ? dbActive.motor_id : state.motors[0].motor_id;
      }
    }
    state.logs = (data.logs || []).map((l) => ({ ...l, motor_id: l.motor_id || "MTR-01" }));
    if (data.master && data.master.length > 0) {
      state.master = data.master.map((c) => ({ ...c, motor_id: c.motor_id || "MTR-01" }));
    }
    persistLocal();
    document.getElementById("setupBanner").classList.add("hidden");
    dot.className = "w-2 h-2 rounded-full bg-emerald-400 shrink-0";
    renderAll();
  } catch (err) {
    dot.className = "w-2 h-2 rounded-full bg-rose-500 shrink-0";
    if (manual) alert("Gagal sinkron: " + err.message);
  } finally {
    btn.classList.remove("opacity-50");
  }
}

function switchTab(tab) {
  state.currentTab = tab;
  document.getElementById("viewDashboard").classList.toggle("hidden", tab !== "dashboard");
  document.getElementById("viewHistory").classList.toggle("hidden", tab !== "history");
  document.getElementById("viewProfile").classList.toggle("hidden", tab !== "profile");

  const activeCls = "flex flex-col items-center justify-center gap-0.5 text-emerald-400 font-bold text-[10px] transition";
  const idleCls = "flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-slate-200 font-medium text-[10px] transition";

  document.getElementById("navDashboard").className = tab === "dashboard" ? activeCls : idleCls;
  document.getElementById("navHistory").className = tab === "history" ? activeCls : idleCls;
  document.getElementById("navProfile").className = tab === "profile" ? activeCls : idleCls;
}

function setFilter(cat) {
  state.filter = cat;
  document.querySelectorAll(".filter-pill").forEach((btn) => {
    const active = btn.dataset.filter === cat;
    btn.className = active
      ? "filter-pill px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500 text-slate-950 transition"
      : "filter-pill px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 transition";
  });
  renderHistory();
}

async function switchMotor(motorId) {
  if (state.activeMotorId === motorId) return;
  state.activeMotorId = motorId;
  state.motors = state.motors.map((m) => ({ ...m, aktif: m.motor_id === motorId }));
  persistLocal();
  renderAll();

  try {
    await apiPostAction("set_active_motor", { motor_id: motorId });
  } catch (err) {}
}

// Modal Catat Kejadian Baru
function openAddModal(preselectedComponent = null) {
  const activeMotor = getActiveMotor();
  document.getElementById("logForm").reset();
  document.getElementById("modalMotorLabel").textContent = `${activeMotor.nama_motor} • ${activeMotor.jenis_motor}`;

  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  document.getElementById("inpTanggal").value = localDate;

  const latest = getLatestOdometer();
  if (latest > 0) {
    document.getElementById("inpOdometer").placeholder = `Terakhir: ${latest}`;
  }
  document.getElementById("odoWarningBox").classList.add("hidden");
  setFormMode("Servis");

  if (preselectedComponent) {
    document.getElementById("inpKategoriServis").value = "Komponen";
    toggleCustomItem();
    document.getElementById("inpKomponen").value = preselectedComponent;
  }

  document.getElementById("addModal").classList.remove("hidden");
}

function closeAddModal() {
  document.getElementById("addModal").classList.add("hidden");
}

function setFormMode(mode) {
  state.formMode = mode;
  const isBensin = mode === "Bensin";

  document.getElementById("modeServisBtn").className = !isBensin
    ? "py-2 text-xs font-bold rounded-lg bg-emerald-500 text-slate-950 transition"
    : "py-2 text-xs font-bold rounded-lg text-slate-400 transition";
  document.getElementById("modeBensinBtn").className = isBensin
    ? "py-2 text-xs font-bold rounded-lg bg-emerald-500 text-slate-950 transition"
    : "py-2 text-xs font-bold rounded-lg text-slate-400 transition";

  document.getElementById("servisFields").classList.toggle("hidden", isBensin);
  document.getElementById("biayaServisWrapper").classList.toggle("hidden", isBensin);
  document.getElementById("bensinFields").classList.toggle("hidden", !isBensin);

  document.getElementById("inpBiayaServis").required = !isBensin;
  document.getElementById("inpBiayaBensin").required = isBensin;
  document.getElementById("inpLiter").required = isBensin;
  toggleCustomItem();
}

function toggleCustomItem() {
  const isJasa = document.getElementById("inpKategoriServis").value === "Jasa";
  document.getElementById("komponenSelectWrapper").classList.toggle("hidden", isJasa);
  document.getElementById("customItemWrapper").classList.toggle("hidden", !isJasa);
  document.getElementById("inpCustomItem").required = isJasa && state.formMode === "Servis";
}

function autoCalcLiter() {
  const rp = Number(document.getElementById("inpBiayaBensin").value);
  const jenis = document.getElementById("inpJenisBbm").value;
  const cfg = getConfig();
  const price = jenis === "Pertalite" ? cfg.pertalitePrice : cfg.pertamaxPrice;
  if (rp > 0 && price > 0) {
    document.getElementById("inpLiter").value = (rp / price).toFixed(2);
  }
}

async function handleSaveLog(e) {
  e.preventDefault();
  const activeMotor = getActiveMotor();
  const tanggal = document.getElementById("inpTanggal").value;
  const odometer = Number(document.getElementById("inpOdometer").value);
  const latestOdo = getLatestOdometer();
  const override = document.getElementById("inpOverrideOdo").checked;

  if (odometer < latestOdo && !override) {
    document.getElementById("odoWarningText").textContent = `Odometer (${formatKm(
      odometer
    )}) lebih kecil dari catatan terakhir (${formatKm(latestOdo)}).`;
    document.getElementById("odoWarningBox").classList.remove("hidden");
    return;
  }

  const isBensin = state.formMode === "Bensin";
  const kategori = isBensin ? "Bensin" : document.getElementById("inpKategoriServis").value;
  const item = isBensin
    ? document.getElementById("inpJenisBbm").value
    : kategori === "Komponen"
      ? document.getElementById("inpKomponen").value
      : document.getElementById("inpCustomItem").value.trim();

  const newLog = {
    id: Date.now().toString(),
    tanggal,
    odometer,
    kategori,
    item,
    liter: isBensin ? Number(document.getElementById("inpLiter").value) : "",
    full_tank: isBensin ? document.getElementById("inpFullTank").checked : false,
    biaya: Number(
      isBensin
        ? document.getElementById("inpBiayaBensin").value
        : document.getElementById("inpBiayaServis").value
    ),
    catatan: document.getElementById("inpCatatan").value.trim(),
    motor_id: activeMotor.motor_id
  };

  const btn = document.getElementById("btnSubmit");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  state.logs.push(newLog);
  persistLocal();
  renderAll();

  try {
    await apiPostAction("create", newLog);
  } catch (err) {
    alert("Tersimpan di memori HP, namun gagal kirim ke Google Sheets: " + err.message);
  }

  btn.disabled = false;
  btn.textContent = "Simpan Catatan";
  closeAddModal();
}

async function deleteLog(id) {
  if (!confirm("Hapus catatan ini?")) return;
  state.logs = state.logs.filter((l) => String(l.id) !== String(id));
  persistLocal();
  renderAll();

  try {
    await apiPostAction("delete", { id });
  } catch (err) {}
}

// Modal Motor Baru
function openMotorModal() {
  document.getElementById("inpMotorNama").value = "";
  document.getElementById("inpMotorJenis").value = "Matic";
  document.getElementById("inpMotorPlat").value = "";
  previewPresetComponents();
  document.getElementById("motorModal").classList.remove("hidden");
}

function closeMotorModal() {
  document.getElementById("motorModal").classList.add("hidden");
}

function previewPresetComponents() {
  const jenis = document.getElementById("inpMotorJenis").value;
  const list = PRESETS_BY_TYPE[jenis] || [];
  document.getElementById("presetPreviewText").textContent = list.map((c) => c.nama_komponen).join(", ");
}

async function handleAddMotor(e) {
  e.preventDefault();
  const nama_motor = document.getElementById("inpMotorNama").value.trim();
  const jenis_motor = document.getElementById("inpMotorJenis").value;
  const plat_nomor = document.getElementById("inpMotorPlat").value.trim().toUpperCase();
  const motor_id = "MTR-" + Date.now().toString().slice(-4);

  const presetComps = (PRESETS_BY_TYPE[jenis_motor] || []).map((c) => ({
    motor_id,
    ...c
  }));

  const newMotor = { motor_id, nama_motor, jenis_motor, plat_nomor, aktif: true };

  const btn = document.getElementById("btnSaveMotor");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  state.motors = state.motors.map((m) => ({ ...m, aktif: false }));
  state.motors.push(newMotor);
  state.master.push(...presetComps);
  state.activeMotorId = motor_id;
  persistLocal();
  renderAll();

  try {
    await apiPostAction("add_motor", { ...newMotor, components: presetComps });
  } catch (err) {
    alert("Motor tersimpan lokal, tetapi gagal sinkron ke Google Sheets.");
  }

  btn.disabled = false;
  btn.textContent = "Simpan ke Garasi";
  closeMotorModal();
}

async function deleteMotor(motorId) {
  const target = state.motors.find((m) => m.motor_id === motorId);
  if (!target) return;
  if (!confirm(`Hapus "${target.nama_motor}" dari daftar garasi?`)) return;

  state.motors = state.motors.filter((m) => m.motor_id !== motorId);
  state.master = state.master.filter((c) => c.motor_id !== motorId);
  if (state.activeMotorId === motorId && state.motors.length > 0) {
    state.activeMotorId = state.motors[0].motor_id;
    state.motors[0].aktif = true;
  }
  persistLocal();
  renderAll();

  try {
    await apiPostAction("delete_motor", { motor_id: motorId });
  } catch (err) {}
}

// Modal Komponen
function openComponentModal(name = "", km = "", months = "") {
  const isEdit = Boolean(name);
  document.getElementById("compModalTitle").textContent = isEdit
    ? "Edit Interval Komponen"
    : "Tambah Komponen Baru";
  document.getElementById("inpCompOldName").value = name;
  document.getElementById("inpCompName").value = name;
  document.getElementById("inpCompKm").value = km;
  document.getElementById("inpCompMonths").value = months;
  document.getElementById("compModal").classList.remove("hidden");
}

function closeComponentModal() {
  document.getElementById("compModal").classList.add("hidden");
}

async function handleSaveComponent(e) {
  e.preventDefault();
  const activeMotor = getActiveMotor();
  const oldName = document.getElementById("inpCompOldName").value;
  const nama_komponen = document.getElementById("inpCompName").value.trim();
  const interval_km = Number(document.getElementById("inpCompKm").value);
  const interval_bulan = Number(document.getElementById("inpCompMonths").value);

  const btn = document.getElementById("btnSaveComp");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  if (oldName) {
    const idx = state.master.findIndex(
      (c) => c.motor_id === activeMotor.motor_id && c.nama_komponen === oldName
    );
    if (idx !== -1) {
      state.master[idx] = { motor_id: activeMotor.motor_id, nama_komponen, interval_km, interval_bulan };
    }
  } else {
    state.master.push({ motor_id: activeMotor.motor_id, nama_komponen, interval_km, interval_bulan });
  }
  persistLocal();
  renderAll();

  try {
    await apiPostAction("save_component", {
      motor_id: activeMotor.motor_id,
      old_nama: oldName,
      nama_komponen,
      interval_km,
      interval_bulan
    });
  } catch (err) {}

  btn.disabled = false;
  btn.textContent = "Simpan Komponen";
  closeComponentModal();
}

async function deleteComponent(namaKomponen) {
  const activeMotor = getActiveMotor();
  if (!confirm(`Hapus komponen "${namaKomponen}" dari ${activeMotor.nama_motor}?`)) return;

  state.master = state.master.filter(
    (c) => !(c.motor_id === activeMotor.motor_id && c.nama_komponen === namaKomponen)
  );
  persistLocal();
  renderAll();

  try {
    await apiPostAction("delete_component", {
      motor_id: activeMotor.motor_id,
      nama_komponen: namaKomponen
    });
  } catch (err) {}
}

// Pengaturan Profil & API
function saveOwnerProfile() {
  const val = document.getElementById("inpOwnerName").value.trim() || "Bayu Choirul Imam";
  localStorage.setItem("veh_owner_name", val);
  renderProfile();
}

async function testConnection() {
  const url = document.getElementById("cfgUrl").value.trim();
  const token = document.getElementById("cfgToken").value.trim();
  const box = document.getElementById("connTestResult");
  const btn = document.getElementById("btnTestConn");

  if (!url) {
    box.className = "text-xs p-2.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30";
    box.textContent = "Masukkan Web App URL terlebih dahulu.";
    box.classList.remove("hidden");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Menguji...";
  box.classList.add("hidden");

  try {
    const data = await apiGetAll(url, token);
    const motorCount = (data.motors || []).length;
    const masterCount = (data.master || []).length;
    const logCount = (data.logs || []).length;
    box.className = "text-xs p-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
    box.textContent = `Terhubung! ${motorCount} motor, ${masterCount} komponen & ${logCount} log.`;
  } catch (err) {
    box.className = "text-xs p-2.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30";
    box.textContent = `Gagal: ${err.message}`;
  } finally {
    box.classList.remove("hidden");
    btn.disabled = false;
    btn.textContent = "Tes Koneksi";
  }
}

function saveSettings() {
  localStorage.setItem("vario_gas_url", document.getElementById("cfgUrl").value.trim());
  localStorage.setItem("vario_gas_token", document.getElementById("cfgToken").value.trim() || DEFAULT_TOKEN);
  localStorage.setItem("vario_pertamax_price", document.getElementById("cfgPertamaxPrice").value || 12100);
  localStorage.setItem("vario_pertalite_price", document.getElementById("cfgPertalitePrice").value || 10000);
  fetchData(true);
}

// Expose actions to inline HTML handlers
window.appActions = {
  fetchData,
  switchTab,
  setFilter,
  switchMotor,
  openAddModal,
  closeAddModal,
  quickLogComponent: (compName) => openAddModal(compName),
  setFormMode,
  toggleCustomItem,
  autoCalcLiter,
  handleSaveLog,
  deleteLog,
  openMotorModal,
  closeMotorModal,
  previewPresetComponents,
  handleAddMotor,
  deleteMotor,
  openComponentModal,
  closeComponentModal,
  handleSaveComponent,
  deleteComponent,
  saveOwnerProfile,
  testConnection,
  saveSettings
};

function init() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  const cfg = getConfig();
  document.getElementById("inpOwnerName").value = cfg.ownerName;
  document.getElementById("cfgUrl").value = cfg.url;
  document.getElementById("cfgToken").value = cfg.token;
  document.getElementById("cfgPertamaxPrice").value = cfg.pertamaxPrice;
  document.getElementById("cfgPertalitePrice").value = cfg.pertalitePrice;

  renderAll();
  if (!cfg.url) {
    document.getElementById("setupBanner").classList.remove("hidden");
  } else {
    fetchData(false);
  }
}

init();
