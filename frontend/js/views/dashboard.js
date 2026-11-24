import {
  getActiveMotor,
  getActiveLogs,
  getLatestOdometer,
  calculateFuelEfficiency,
  computeComponentStatuses,
  formatRp,
  formatKm
} from "../store.js";

export function renderDashboard() {
  const activeMotor = getActiveMotor();
  const mLogs = getActiveLogs();
  const latestOdo = getLatestOdometer();

  // Hero Odometer & Motor Info
  document.getElementById("heroMotorName").textContent = activeMotor.nama_motor;
  document.getElementById("heroMotorMeta").textContent =
    activeMotor.jenis_motor + (activeMotor.plat_nomor ? ` • ${activeMotor.plat_nomor}` : "");
  document.getElementById("heroOdoNumber").textContent = Number(latestOdo).toLocaleString("id-ID");

  // Monthly Expense
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLogs = mLogs.filter((l) => String(l.tanggal).startsWith(currentMonth));
  const monthTotal = monthLogs.reduce((sum, l) => sum + (Number(l.biaya) || 0), 0);
  const fuelTotal = monthLogs
    .filter((l) => l.kategori === "Bensin")
    .reduce((sum, l) => sum + (Number(l.biaya) || 0), 0);
  const serviceTotal = monthTotal - fuelTotal;

  document.getElementById("monthlyExpense").textContent = formatRp(monthTotal);
  document.getElementById("monthlyBreakdown").textContent =
    `Servis ${formatRp(serviceTotal)} • BBM ${formatRp(fuelTotal)}`;

  // Fuel Efficiency
  const kmPerLiter = calculateFuelEfficiency();
  document.getElementById("fuelEfficiency").textContent = kmPerLiter ? `${kmPerLiter} km/L` : "— km/L";
  document.getElementById("fuelEfficiencySub").textContent = kmPerLiter
    ? "Siklus full tank terakhir"
    : "Butuh min. 2x full tank";

  // Component Health Summary Pills + Cards
  const statuses = computeComponentStatuses();
  const okCount = statuses.filter((s) => s.hasHistory && s.statusLevel === "ok").length;
  const warnCount = statuses.filter((s) => s.hasHistory && s.statusLevel === "warn").length;
  const dangerCount = statuses.filter((s) => s.hasHistory && s.statusLevel === "danger").length;

  document.getElementById("healthOkCount").textContent = okCount;
  document.getElementById("healthWarnCount").textContent = warnCount;
  document.getElementById("healthDangerCount").textContent = dangerCount;

  const compContainer = document.getElementById("componentList");
  if (statuses.length === 0) {
    compContainer.innerHTML = `<div class="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">Belum ada daftar komponen untuk motor ini. Tambahkan di tab <b>Profil</b>.</div>`;
    return;
  }

  compContainer.innerHTML = statuses
    .map((item) => {
      const escapedName = item.nama_komponen.replace(/'/g, "\\'");
      if (!item.hasHistory) {
        return `
          <div class="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-3.5">
            <div class="flex items-center justify-between gap-2 mb-2">
              <div>
                <p class="text-xs font-bold text-slate-200">${item.nama_komponen}</p>
                <p class="text-[10px] text-slate-500 mt-0.5">Interval ${Number(item.interval_km).toLocaleString("id-ID")} km • ${item.interval_bulan} bln</p>
              </div>
              <button type="button" onclick="window.appActions.quickLogComponent('${escapedName}')" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-[11px] font-semibold text-slate-300 border border-slate-700 transition">
                + Catat Awal
              </button>
            </div>
            <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full bg-slate-700 w-0"></div>
            </div>
          </div>
        `;
      }

      let barGradient = "from-emerald-500 to-teal-400";
      let badgeStyle = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      let cardBorder = "border-slate-800/90";

      if (item.statusLevel === "danger") {
        barGradient = "from-rose-600 to-rose-400";
        badgeStyle = "bg-rose-500/15 text-rose-400 border-rose-500/30";
        cardBorder = "border-rose-500/30";
      } else if (item.statusLevel === "warn") {
        barGradient = "from-amber-500 to-yellow-400";
        badgeStyle = "bg-amber-500/15 text-amber-400 border-amber-500/30";
        cardBorder = "border-amber-500/30";
      }

      const kmLabel =
        item.remainingKm >= 0
          ? `Sisa ${item.remainingKm.toLocaleString("id-ID")} km`
          : `Lewat ${Math.abs(item.remainingKm).toLocaleString("id-ID")} km`;

      const timeSub = item.intervalMonths > 0 ? ` • ${item.usedMonths.toFixed(1)}/${item.intervalMonths} bln` : "";

      return `
        <div class="bg-slate-900/90 border ${cardBorder} rounded-2xl p-3.5 transition">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-xs font-bold text-white truncate">${item.nama_komponen}</p>
                <span class="px-1.5 py-0.5 text-[10px] font-bold rounded-md border ${badgeStyle} shrink-0">${item.effectivePct}%</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">
                ${item.usedKm.toLocaleString("id-ID")} / ${item.intervalKm.toLocaleString("id-ID")} km (<span class="font-semibold text-slate-200">${kmLabel}</span>)
              </p>
            </div>
            <button type="button" onclick="window.appActions.quickLogComponent('${escapedName}')" class="shrink-0 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-[11px] font-semibold text-emerald-400 border border-slate-700/80 transition active:scale-95">
              Ganti
            </button>
          </div>
          <div class="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-[1px] border border-slate-800/80">
            <div class="h-full bg-gradient-to-r ${barGradient} rounded-full transition-all duration-500" style="width: ${item.effectivePct}%"></div>
          </div>
          <p class="text-[10px] text-slate-500 mt-1.5">Terakhir: ${item.lastLog.tanggal} @ ${item.lastReplacedOdo.toLocaleString("id-ID")} km${timeSub}</p>
        </div>
      `;
    })
    .join("");
}
