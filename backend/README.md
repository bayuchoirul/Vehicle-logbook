# Backend — Google Apps Script (`Vehicle_Tracker_DB`)

## Struktur Tab Google Sheets
1. **`Motors`**: `motor_id | nama_motor | jenis_motor | plat_nomor | aktif`
2. **`Master_Komponen`**: `motor_id | nama_komponen | interval_km | interval_bulan`
3. **`Logs`**: `id | tanggal | odometer | kategori | item | liter | full_tank | biaya | catatan | motor_id`

## Cara Update Deployment
1. Buka Google Sheets **Vehicle_Tracker_DB** > **Extensions > Apps Script**.
2. Salin isi `backend/Code.gs` ke editor Apps Script.
3. Klik **Deploy > Manage deployments** > ikon pensil (**Edit**) > pilih **New version** > **Deploy**.
