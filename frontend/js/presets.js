export const DEFAULT_TOKEN = "vario110_8f92a4c7e1b04d39";

export const PRESETS_BY_TYPE = {
  Matic: [
    { nama_komponen: "Oli Mesin", interval_km: 2000, interval_bulan: 2 },
    { nama_komponen: "Oli Gardan", interval_km: 6000, interval_bulan: 6 },
    { nama_komponen: "V-Belt & Roller", interval_km: 24000, interval_bulan: 24 },
    { nama_komponen: "Kampas Rem Depan", interval_km: 10000, interval_bulan: 12 },
    { nama_komponen: "Kampas Rem Belakang", interval_km: 15000, interval_bulan: 18 },
    { nama_komponen: "Filter Udara", interval_km: 12000, interval_bulan: 12 },
    { nama_komponen: "Busi", interval_km: 8000, interval_bulan: 8 },
    { nama_komponen: "Ban Depan", interval_km: 20000, interval_bulan: 24 },
    { nama_komponen: "Ban Belakang", interval_km: 18000, interval_bulan: 24 }
  ],
  Bebek: [
    { nama_komponen: "Oli Mesin", interval_km: 2500, interval_bulan: 2 },
    { nama_komponen: "Rantai & Gir Set", interval_km: 15000, interval_bulan: 18 },
    { nama_komponen: "Kampas Kopling", interval_km: 20000, interval_bulan: 24 },
    { nama_komponen: "Kampas Rem Depan", interval_km: 10000, interval_bulan: 12 },
    { nama_komponen: "Kampas Rem Belakang", interval_km: 15000, interval_bulan: 18 },
    { nama_komponen: "Filter Udara", interval_km: 12000, interval_bulan: 12 },
    { nama_komponen: "Busi", interval_km: 8000, interval_bulan: 8 },
    { nama_komponen: "Ban Depan", interval_km: 20000, interval_bulan: 24 },
    { nama_komponen: "Ban Belakang", interval_km: 18000, interval_bulan: 24 }
  ],
  Sport: [
    { nama_komponen: "Oli Mesin", interval_km: 3000, interval_bulan: 3 },
    { nama_komponen: "Rantai & Gir Set", interval_km: 15000, interval_bulan: 18 },
    { nama_komponen: "Kampas Kopling", interval_km: 25000, interval_bulan: 24 },
    { nama_komponen: "Kampas Rem Depan", interval_km: 10000, interval_bulan: 12 },
    { nama_komponen: "Kampas Rem Belakang", interval_km: 12000, interval_bulan: 15 },
    { nama_komponen: "Filter Udara", interval_km: 12000, interval_bulan: 12 },
    { nama_komponen: "Busi", interval_km: 10000, interval_bulan: 12 },
    { nama_komponen: "Air Radiator", interval_km: 12000, interval_bulan: 12 },
    { nama_komponen: "Ban Depan", interval_km: 18000, interval_bulan: 24 },
    { nama_komponen: "Ban Belakang", interval_km: 15000, interval_bulan: 24 }
  ],
  Listrik: [
    { nama_komponen: "Kampas Rem Depan", interval_km: 10000, interval_bulan: 12 },
    { nama_komponen: "Kampas Rem Belakang", interval_km: 12000, interval_bulan: 15 },
    { nama_komponen: "Minyak Rem", interval_km: 20000, interval_bulan: 24 },
    { nama_komponen: "Bearing Roda", interval_km: 20000, interval_bulan: 24 },
    { nama_komponen: "Ban Depan", interval_km: 20000, interval_bulan: 24 },
    { nama_komponen: "Ban Belakang", interval_km: 18000, interval_bulan: 24 }
  ]
};

export const DEFAULT_MOTORS = [
  {
    motor_id: "MTR-01",
    nama_motor: "Honda Vario 110 eSP",
    jenis_motor: "Matic",
    plat_nomor: "",
    aktif: true
  }
];

export const DEFAULT_MASTER = PRESETS_BY_TYPE.Matic.map((c) => ({
  motor_id: "MTR-01",
  ...c
}));
