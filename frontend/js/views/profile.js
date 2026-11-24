import {
  state,
  getConfig,
  getActiveMotor,
  getActiveMaster,
  getLatestOdometer,
  formatKm
} from "../store.js";

export function renderProfile() {
  const cfg = getConfig();
  const initials = cfg.ownerName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "GR";

  document.getElementById("ownerInitials").textContent = initials;
  document.getElementById("garageSummaryText").textContent = `${state.motors.length} Kendaraan Terdaftar`;

  const activeMotor = getActiveMotor();

  // Kartu Garasi Multi-Motor
  const garageList = document.getElementById("garageMotorList");
  garageList.innerHTML = state.motors
    .map((m) => {
      const isSelected = m.motor_id === activeMotor.motor_id;
      const maxOdo = getLatestOdometer(m.motor_id);
      const compCount = state.master.filter((c) => (c.motor_id || "MTR-01") === m.motor_id).length;

      return `
        <div onclick="window.appActions.switchMotor('${m.motor_id}')" class="p-3.5 rounded-2xl border transition cursor-pointer ${
          isSelected
            ? "garage-hero-card border-emerald-500/50 shadow-lg shadow-emerald-950/30"
            : "bg-slate-950/90 border-slate-800 hover:border-slate-700"
        }">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-bold text-white truncate">${m.nama_motor}</p>
                ${
                  isSelected
                    ? '<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-slate-950 shrink-0">Aktif</span>'
                    : ""
                }
              </div>
              <div class="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                <span class="px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 font-medium">${m.jenis_motor}</span>
                ${m.plat_nomor ? `<span>• ${m.plat_nomor}</span>` : ""}
                <span>• ${compCount} part</span>
              </div>
            </div>
            ${
              state.motors.length > 1
                ? `<button type="button" onclick="event.stopPropagation(); window.appActions.deleteMotor('${m.motor_id}')" class="text-[11px] text-slate-500 hover:text-rose-400 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">Hapus</button>`
                : ""
            }
          </div>
          <div class="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span class="text-slate-500">Odometer Terkini</span>
            <span class="font-bold ${isSelected ? "text-emerald-400" : "text-slate-300"}">${formatKm(maxOdo)}</span>
          </div>
        </div>
      `;
    })
    .join("");

  // Daftar Master Komponen Motor Aktif
  const mMaster = getActiveMaster();
  const masterList = document.getElementById("masterComponentList");
  masterList.innerHTML = mMaster
    .map((c) => {
      const escaped = c.nama_komponen.replace(/'/g, "\\'");
      return `
        <div class="py-2.5 flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="text-xs font-semibold text-white truncate">${c.nama_komponen}</p>
            <p class="text-[10px] text-slate-400">Interval ${Number(c.interval_km).toLocaleString("id-ID")} km atau ${c.interval_bulan} bulan</p>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" onclick="window.appActions.openComponentModal('${escaped}', ${c.interval_km}, ${c.interval_bulan})" class="text-[11px] font-semibold text-slate-300 hover:text-emerald-400 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">Edit</button>
            <button type="button" onclick="window.appActions.deleteComponent('${escaped}')" class="text-[11px] text-slate-500 hover:text-rose-400 px-2 py-1">✕</button>
          </div>
        </div>
      `;
    })
    .join("");
}
