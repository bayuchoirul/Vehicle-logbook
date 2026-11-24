import { state, getActiveLogs, formatRp, formatKm } from "../store.js";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function formatMonthGroup(yyyyMm) {
  const [y, m] = yyyyMm.split("-");
  const idx = Number(m) - 1;
  return `${MONTH_NAMES[idx] || m} ${y}`;
}

export function renderHistory() {
  const list = document.getElementById("historyList");
  const mLogs = getActiveLogs();

  // Hitung efisiensi per siklus full tank untuk ditampilkan di log bensin
  const fuelEfficiencyById = {};
  const fuelSorted = mLogs
    .filter((l) => l.kategori === "Bensin" && Number(l.liter) > 0)
    .sort((a, b) => Number(a.odometer) - Number(b.odometer));

  let prevFullIdx = -1;
  fuelSorted.forEach((log, idx) => {
    const isFull = log.full_tank === true || log.full_tank === "TRUE";
    if (isFull) {
      if (prevFullIdx !== -1) {
        const dist = Number(log.odometer) - Number(fuelSorted[prevFullIdx].odometer);
        let liters = 0;
        for (let i = prevFullIdx + 1; i <= idx; i++) {
          liters += Number(fuelSorted[i].liter);
        }
        if (dist > 0 && liters > 0) {
          fuelEfficiencyById[String(log.id)] = (dist / liters).toFixed(1);
        }
      }
      prevFullIdx = idx;
    }
  });

  const filtered = mLogs
    .filter((l) => state.filter === "ALL" || l.kategori === state.filter)
    .sort((a, b) => {
      if (b.tanggal !== a.tanggal) return String(b.tanggal).localeCompare(String(a.tanggal));
      return Number(b.odometer) - Number(a.odometer);
    });

  const totalFiltered = filtered.reduce((sum, l) => sum + (Number(l.biaya) || 0), 0);
  document.getElementById("filteredTotal").textContent = formatRp(totalFiltered);

  if (filtered.length === 0) {
    list.innerHTML = `<div class="bg-slate-900/60 border border-slate-800 rounded-2xl text-center py-12 px-4 text-xs text-slate-500">Belum ada catatan transaksi untuk kategori ini.</div>`;
    return;
  }

  // Kelompokkan berdasarkan YYYY-MM
  const groups = {};
  filtered.forEach((log) => {
    const ym = String(log.tanggal).slice(0, 7) || "Lainnya";
    if (!groups[ym]) groups[ym] = [];
    groups[ym].push(log);
  });

  list.innerHTML = Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map((ym) => {
      const items = groups[ym];
      const groupSum = items.reduce((s, l) => s + (Number(l.biaya) || 0), 0);

      const cardsHtml = items
        .map((log) => {
          const isBensin = log.kategori === "Bensin";
          const isKomponen = log.kategori === "Komponen";

          const iconBg = isBensin
            ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
            : isKomponen
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-purple-500/15 text-purple-400 border-purple-500/30";

          const iconSvg = isBensin
            ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h11M9 21V3m6 3l3 3v9a2 2 0 01-2 2h-1"/></svg>`
            : isKomponen
              ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>`
              : `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>`;

          const eff = fuelEfficiencyById[String(log.id)];
          const effBadge = eff
            ? `<span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">${eff} km/L</span>`
            : "";

          const subDetail = isBensin
            ? `${log.liter} L ${log.full_tank === true || log.full_tank === "TRUE" ? "• Full" : "• Partial"}${log.catatan ? " • " + log.catatan : ""}`
            : log.catatan || log.kategori;

          return `
            <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl border ${iconBg} flex items-center justify-center shrink-0">
                  ${iconSvg}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <p class="text-xs font-bold text-white truncate">${log.item}</p>
                    ${effBadge}
                  </div>
                  <p class="text-[11px] text-slate-400 truncate mt-0.5">${log.tanggal} • ${formatKm(log.odometer)}</p>
                  <p class="text-[10px] text-slate-500 truncate mt-0.5">${subDetail}</p>
                </div>
              </div>
              <div class="text-right shrink-0">
                <p class="text-xs font-bold text-white">${formatRp(log.biaya)}</p>
                <button type="button" onclick="window.appActions.deleteLog('${log.id}')" class="text-[10px] text-slate-500 hover:text-rose-400 mt-1">Hapus</button>
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="space-y-2">
          <div class="flex items-center justify-between px-1 pt-1">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">${formatMonthGroup(ym)}</span>
            <span class="text-[11px] font-semibold text-slate-400">${formatRp(groupSum)}</span>
          </div>
          <div class="space-y-2">${cardsHtml}</div>
        </div>
      `;
    })
    .join("");
}
