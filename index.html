<!DOCTYPE html>
<html lang="id" class="h-full bg-slate-50">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0284c7" />
  <title>Dashboard — Vehicle Logbook</title>
  <link rel="manifest" href="./manifest.webmanifest" crossorigin="use-credentials" />
  <link rel="stylesheet" href="./css/output.css" />
</head>
<body class="min-h-full bg-slate-50 text-slate-900">
  <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <div class="flex items-center gap-3">
        <a href="./index.html" class="text-base font-bold tracking-tight text-slate-900">
          Vehicle Logbook
        </a>
        <nav class="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <a href="./index.html" class="rounded-lg bg-white px-3 py-1.5 text-slate-900 shadow-xs">
            Dashboard
          </a>
          <a href="./logs.html" class="rounded-lg px-3 py-1.5 text-slate-600 hover:text-slate-900">
            Riwayat Log
          </a>
        </nav>
      </div>

      <div class="flex items-center gap-2.5">
        <span id="user-email" class="hidden text-xs text-slate-500 sm:inline"></span>
        <button
          type="button"
          id="btn-signout"
          class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Keluar
        </button>
      </div>
    </div>
  </header>

  <main class="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
    <!-- Vehicle Selector Bar -->
    <section class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap items-center gap-2.5">
        <select
          id="vehicle-selector"
          aria-label="Pilih kendaraan"
          class="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:outline-none"
        >
          <option value="">Memuat kendaraan...</option>
        </select>
        <span
          id="vehicle-meta-badge"
          class="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700"
        >
          —
        </span>
        <button
          type="button"
          id="btn-open-edit-vehicle-modal"
          class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Edit Profil
        </button>
        <button
          type="button"
          id="btn-open-vehicle-modal"
          class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          + Kendaraan
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          id="btn-open-fuel-modal"
          class="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-700"
        >
          + Isi BBM
        </button>
        <button
          type="button"
          id="btn-open-maint-modal"
          class="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-600"
        >
          + Catat Servis
        </button>
      </div>
    </section>

    <!-- Empty State -->
    <section
      id="empty-vehicle-banner"
      class="hidden rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"
    >
      <h2 class="text-lg font-bold text-slate-900">Belum Ada Kendaraan Terdaftar</h2>
      <p class="mt-1 text-sm text-slate-600">
        Tambahkan motor atau mobil pertama Anda untuk mulai memantau konsumsi BBM dan jadwal perawatan.
      </p>
      <button
        type="button"
        id="btn-empty-add-vehicle"
        class="mt-4 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
      >
        + Tambah Kendaraan Pertama
      </button>
    </section>

    <!-- Main Dashboard -->
    <div id="dashboard-main" class="space-y-6">
      <!-- KPI Grid -->
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p class="text-xs font-medium text-slate-500">Odometer Terkini</p>
          <p id="kpi-odometer" class="mt-1 text-2xl font-bold text-slate-900">0 km</p>
          <p id="kpi-distance" class="mt-1 text-xs text-slate-500">Jarak tercatat: 0 km</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p class="text-xs font-medium text-slate-500">Efisiensi Rata-Rata</p>
          <p id="kpi-avg-kmpl" class="mt-1 text-2xl font-bold text-emerald-700">— km/L</p>
          <p id="kpi-last-kmpl" class="mt-1 text-xs text-slate-500">Butuh min. 2x full tank</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p class="text-xs font-medium text-slate-500">Total Pengeluaran</p>
          <p id="kpi-total-cost" class="mt-1 text-2xl font-bold text-slate-900">Rp 0</p>
          <p id="kpi-cost-per-km" class="mt-1 text-xs text-slate-500">Rp — / km</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p class="text-xs font-medium text-slate-500">Rincian Biaya</p>
          <p class="mt-1 text-xs text-slate-600">
            BBM: <strong id="kpi-fuel-cost" class="text-slate-900">Rp 0</strong>
          </p>
          <p class="mt-1 text-xs text-slate-600">
            Servis: <strong id="kpi-maint-cost" class="text-slate-900">Rp 0</strong>
          </p>
          <p id="kpi-tank-range" class="mt-1 text-[11px] font-medium text-sky-700">
            Estimasi tangki: — km
          </p>
        </div>
      </section>

      <!-- Analytics Grid -->
      <section class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 class="text-sm font-bold text-slate-900">Pengingat Servis &amp; Pajak STNK</h2>
          <div id="service-reminders-list" class="mt-3 space-y-2.5"></div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 class="text-sm font-bold text-slate-900">Tren Efisiensi BBM (Full-to-Full)</h2>
          <div id="efficiency-trend-chart" class="mt-3 space-y-2.5"></div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 class="text-sm font-bold text-slate-900">Pengeluaran 6 Bulan Terakhir</h2>
          <div id="monthly-spend-chart" class="mt-3 space-y-3"></div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 class="text-sm font-bold text-slate-900">Distribusi Jenis BBM</h2>
          <div id="fuel-brand-breakdown" class="mt-3 space-y-2.5"></div>
        </div>
      </section>

      <!-- Recent Activity -->
      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-slate-900">Aktivitas Terbaru</h2>
          <a href="./logs.html" class="text-xs font-semibold text-sky-600 hover:text-sky-700">
            Lihat Semua &rarr;
          </a>
        </div>
        <div id="recent-activity-list" class="mt-2 divide-y divide-slate-100"></div>
      </section>
    </div>
  </main>

  <!-- Modal: Tambah Kendaraan -->
  <div
    id="modal-add-vehicle"
    data-modal-backdrop
    class="fixed inset-0 z-40 hidden items-center justify-center bg-slate-900/50 p-4"
  >
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-bold text-slate-900">Tambah Kendaraan</h3>
        <button type="button" data-close-modal="modal-add-vehicle" class="text-slate-400 hover:text-slate-700">&times;</button>
      </div>
      <div data-modal-error class="mt-3 hidden rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"></div>
      <form id="form-add-vehicle" class="mt-4 space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-700">Nama Kendaraan *</label>
          <input name="name" required placeholder="Contoh: Honda Vario 110 eSP" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Nomor Polisi</label>
            <input name="plate_number" placeholder="B 1234 XYZ" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">BBM Utama</label>
            <select id="vehicle-fuel-type" name="fuel_type" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"></select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Kapasitas Tangki (L)</label>
            <input name="tank_capacity_liters" type="number" step="0.1" value="3.7" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Odometer Awal (km)</label>
            <input name="initial_odometer_km" type="number" step="0.1" value="0" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Jatuh Tempo Pajak STNK</label>
            <input name="tax_due_date" type="date" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Jatuh Tempo Plat 5 Thn</label>
            <input name="plate_due_date" type="date" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" data-close-modal="modal-add-vehicle" class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">Batal</button>
          <button type="submit" id="btn-submit-vehicle" class="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700">Simpan</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Edit Kendaraan -->
  <div
    id="modal-edit-vehicle"
    data-modal-backdrop
    class="fixed inset-0 z-40 hidden items-center justify-center bg-slate-900/50 p-4"
  >
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-bold text-slate-900">Edit Profil Kendaraan</h3>
        <button type="button" data-close-modal="modal-edit-vehicle" class="text-slate-400 hover:text-slate-700">&times;</button>
      </div>
      <div data-modal-error class="mt-3 hidden rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"></div>
      <form id="form-edit-vehicle" class="mt-4 space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-700">Nama Kendaraan *</label>
          <input id="edit-vehicle-name" name="name" required class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Nomor Polisi</label>
            <input id="edit-vehicle-plate" name="plate_number" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Merek / Tipe</label>
            <input id="edit-vehicle-brand-model" name="brand_model" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">BBM Utama</label>
            <select id="edit-vehicle-fuel-type" name="fuel_type" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"></select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Kapasitas Tangki (L)</label>
            <input id="edit-vehicle-tank" name="tank_capacity_liters" type="number" step="0.1" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Jatuh Tempo Pajak STNK</label>
            <input id="edit-vehicle-tax-due" name="tax_due_date" type="date" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Jatuh Tempo Plat 5 Thn</label>
            <input id="edit-vehicle-plate-due" name="plate_due_date" type="date" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" data-close-modal="modal-edit-vehicle" class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">Batal</button>
          <button type="submit" id="btn-submit-edit-vehicle" class="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700">Simpan Perubahan</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Tambah BBM -->
  <div
    id="modal-add-fuel"
    data-modal-backdrop
    class="fixed inset-0 z-40 hidden items-center justify-center bg-slate-900/50 p-4"
  >
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-bold text-slate-900">Catat Pengisian BBM</h3>
        <button type="button" data-close-modal="modal-add-fuel" class="text-slate-400 hover:text-slate-700">&times;</button>
      </div>
      <div data-modal-error class="mt-3 hidden rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"></div>
      <form id="form-add-fuel" class="mt-4 space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Tanggal *</label>
            <input id="fuel-date" name="logged_at" type="date" required class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Odometer (km) *</label>
            <input id="fuel-odometer" name="odometer_km" type="number" step="0.1" required class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Produk BBM *</label>
            <select id="fuel-brand" name="fuel_brand" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"></select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Harga / Liter (Rp) *</label>
            <input id="fuel-price" name="price_per_liter" type="number" step="1" required class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <div class="mb-1 flex items-center justify-between">
            <label class="text-xs font-medium text-slate-700">Total Bayar (Rp) *</label>
            <span class="text-xs font-semibold text-slate-500">
              Volume: <strong id="fuel-liters-preview" class="text-slate-400">0,00 L</strong>
            </span>
          </div>
          <input id="fuel-total" name="total_cost" type="number" step="1" required placeholder="35000" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <div class="mt-1.5 flex flex-wrap gap-1.5">
            <button type="button" data-fuel-preset="20000" class="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200">20rb</button>
            <button type="button" data-fuel-preset="30000" class="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200">30rb</button>
            <button type="button" data-fuel-preset="35000" class="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200">35rb</button>
            <button type="button" data-fuel-preset="40000" class="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200">40rb</button>
          </div>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-700">Nama SPBU (Opsional)</label>
          <input id="fuel-station" name="station_name" placeholder="Pertamina Cinere" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <label class="flex items-center gap-2 text-xs font-medium text-slate-700">
          <input type="checkbox" name="is_full_tank" checked class="rounded border-slate-300 text-sky-600" />
          Isi penuh (Full Tank) untuk menghitung km/L
        </label>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" data-close-modal="modal-add-fuel" class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">Batal</button>
          <button type="submit" id="btn-submit-fuel" class="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700">Simpan BBM</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Tambah Servis -->
  <div
    id="modal-add-maint"
    data-modal-backdrop
    class="fixed inset-0 z-40 hidden items-center justify-center bg-slate-900/50 p-4"
  >
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-bold text-slate-900">Catat Servis &amp; Perawatan</h3>
        <button type="button" data-close-modal="modal-add-maint" class="text-slate-400 hover:text-slate-700">&times;</button>
      </div>
      <div data-modal-error class="mt-3 hidden rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"></div>
      <form id="form-add-maint" class="mt-4 space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Tanggal *</label>
            <input id="maint-date" name="logged_at" type="date" required class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Odometer (km) *</label>
            <input id="maint-odometer" name="odometer_km" type="number" step="0.1" required class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Kategori *</label>
            <select id="maint-category" name="category" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="oil_change">Ganti Oli Mesin / Gardan</option>
              <option value="cvt_belt">Servis CVT / V-Belt / Roller</option>
              <option value="tires">Ban &amp; Tekanan Angin</option>
              <option value="brakes">Kampas &amp; Minyak Rem</option>
              <option value="battery">Aki &amp; Kelistrikan</option>
              <option value="tune_up">Tune Up &amp; Injeksi</option>
              <option value="other">Lainnya</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Biaya (Rp) *</label>
            <input name="total_cost" type="number" step="1" required placeholder="65000" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-700">Pekerjaan / Komponen *</label>
          <input name="title" required placeholder="Contoh: Ganti Oli MPX2 + Oli Gardan" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-700">Bengkel (Opsional)</label>
          <input id="maint-workshop" name="workshop_name" placeholder="AHASS / Sukoharjo Motor" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-700">Target Servis Berikutnya (km)</label>
          <input id="maint-next-due" name="next_due_km" type="number" step="1" placeholder="Opsional" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <div id="maint-interval-hint" class="mt-1.5 hidden items-center justify-between rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
            <span id="maint-interval-label"></span>
            <button type="button" id="btn-apply-maint-interval" class="font-bold underline">Terapkan</button>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" data-close-modal="modal-add-maint" class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">Batal</button>
          <button type="submit" id="btn-submit-maint" class="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600">Simpan Servis</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Konfirmasi Pembayaran Pajak STNK / Plat 5 Tahunan -->
  <div
    id="modal-pay-tax"
    data-modal-backdrop
    class="fixed inset-0 z-40 hidden items-center justify-center bg-slate-900/50 p-4"
  >
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <div class="flex items-center justify-between">
        <h3 id="pay-tax-modal-title" class="text-base font-bold text-slate-900">
          Konfirmasi Pembayaran Pajak
        </h3>
        <button type="button" data-close-modal="modal-pay-tax" class="text-slate-400 hover:text-slate-700">&times;</button>
      </div>
      <div data-modal-error class="mt-3 hidden rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"></div>

      <form id="form-pay-tax" class="mt-4 space-y-3.5">
        <input type="hidden" id="pay-tax-kind" name="kind" value="tax" />

        <div class="rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-xs text-sky-900 space-y-1">
          <p id="pay-tax-summary" class="font-semibold"></p>
          <p id="pay-tax-prev-due" class="text-sky-700"></p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Tanggal Bayar *</label>
            <input id="pay-tax-date" name="paid_at" type="date" required class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Jatuh Tempo Baru *</label>
            <input id="pay-tax-next-due" name="next_due_date" type="date" required class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <label class="flex items-center gap-2 text-xs font-medium text-slate-700">
          <input id="pay-tax-record-expense" type="checkbox" name="record_expense" checked class="rounded border-slate-300 text-emerald-600" />
          Catat biaya pajak ke riwayat pengeluaran kendaraan
        </label>

        <div id="pay-tax-expense-fields" class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Total Biaya Pajak (Rp)</label>
            <input id="pay-tax-cost" name="total_cost" type="number" step="1" placeholder="235000" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-700">Kanal / Samsat</label>
            <input id="pay-tax-channel" name="channel" placeholder="SIGNAL / Samsat Depok" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" data-close-modal="modal-pay-tax" class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">
            Batal
          </button>
          <button type="submit" id="btn-submit-pay-tax" class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
            Simpan Pembayaran
          </button>
        </div>
      </form>
    </div>
  </div>

  <script type="module" src="./js/controllers/dashboard-controller.js"></script>
</body>
</html>