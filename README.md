# Vehicle Logbook (Supabase + Vercel PWA)

Aplikasi web progresif (PWA) untuk mencatat konsumsi bahan bakar (`km/L`, `Rp/km`), odometer, dan riwayat servis kendaraan dengan penyimpanan cloud PostgreSQL + Row Level Security di **Supabase**.

## Struktur Proyek

```text
vehicle-logbook/
├── css/
│   └── styles.css                 # Output hasil compile Tailwind CSS
├── database/
│   └── schema.sql                 # Skema tabel, trigger odometer & RLS policies Supabase
├── js/
│   ├── config.js                  # Dihasilkan otomatis oleh scripts/build-config.js
│   ├── types.js                   # JSDoc typedefs untuk checkJs
│   ├── controllers/
│   │   ├── dashboard-controller.js
│   │   ├── logbook-controller.js
│   │   └── login-controller.js
│   ├── services/
│   │   ├── auth-service.js
│   │   ├── supabase-client.js
│   │   └── vehicle-service.js
│   └── utils/
│       ├── dom.js
│       └── metrics.js
├── scripts/
│   └── build-config.js            # Generator js/config.js dari ENV
├── src/
│   └── input.css                  # Entry point Tailwind CSS v4
├── tests/
│   └── metrics.test.js            # Unit test native node:test
├── index.html                     # Dashboard utama
├── logs.html                      # Tabel riwayat lengkap + ekspor CSV
├── login.html                     # Halaman login & registrasi
├── manifest.webmanifest           # Konfigurasi PWA
├── sw.js                          # Service Worker offline shell
├── package.json
├── jsconfig.json
└── vercel.json
```

## Langkah Setup

1. **Jalankan Skema SQL di Supabase:**
   Buka **Supabase Dashboard → SQL Editor**, salin isi `database/schema.sql`, lalu klik **Run**.

2. **Konfigurasi Lokal:**
   ```bash
   cp .env.example .env
   # Isi SUPABASE_URL dan SUPABASE_ANON_KEY di .env
   npm install
   npm run build
   npm test
   ```

3. **Deploy ke Vercel:**
   - Tambahkan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` di **Vercel → Project Settings → Environment Variables**.
   - Push ke GitHub (`git add . && git commit -m "Refactor full codebase" && git push`).
