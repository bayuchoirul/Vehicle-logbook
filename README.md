# Vehicle Logbook PWA (Supabase Edition)

Aplikasi PWA pencatatan konsumsi BBM (Pertamax) dan perawatan rutin kendaraan bermotor (Honda Vario 110 eSP) berbasis **Supabase PostgreSQL + RLS** dan **Vercel**.

## Setup Cepat
1. Jalankan `database/schema.sql` di **Supabase SQL Editor**.
2. Atur **Environment Variables** di Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Jalankan lokal:
   ```bash
   npm install
   npm run typecheck
   npm run build
   ```
4. Deploy ke Vercel (`git push origin main`).
