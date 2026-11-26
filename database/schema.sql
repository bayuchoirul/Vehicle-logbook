-- database/schema.sql
create extension if not exists "pgcrypto";

-- 1. Tabel Kendaraan (Vehicles)
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand_model text not null default '',
  plate_number text not null default '',
  tank_capacity_liters numeric(6, 2) not null default 3.70,
  default_fuel_type text not null default 'Pertamax',
  total_odometer_km numeric(10, 2) not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Tabel Log Pengisian BBM (Fuel Logs)
create table if not exists public.vehicle_fuel_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  date date not null default current_date,
  odometer_km numeric(10, 2) not null,
  trip_distance_km numeric(10, 2) not null default 0,
  liters numeric(6, 3) not null check (liters > 0),
  price_per_liter numeric(12, 2) not null default 0,
  total_cost numeric(12, 2) not null default 0,
  fuel_type text not null default 'Pertamax',
  station text not null default '',
  is_full_tank boolean not null default true,
  consumption_km_per_liter numeric(6, 2),
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- 3. Tabel Log Perawatan & Suku Cadang (Maintenance Logs)
create table if not exists public.vehicle_maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  date date not null default current_date,
  odometer_km numeric(10, 2) not null default 0,
  title text not null,
  category text not null default 'Service',
  cost numeric(12, 2) not null default 0,
  workshop text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- 4. Tabel Aturan Interval Servis Motor (Component Rules)
create table if not exists public.vehicle_component_rules (
  id uuid primary key default gen_random_uuid(),
  category_name text not null unique,
  badge_label text not null,
  description text not null default '',
  default_max_km numeric(10, 2) not null default 3000,
  default_max_months int4 not null default 6,
  warn_threshold_pct int4 not null default 75,
  crit_threshold_pct int4 not null default 90
);

-- Aktifkan Row Level Security (RLS)
alter table public.vehicles enable row level security;
alter table public.vehicle_fuel_logs enable row level security;
alter table public.vehicle_maintenance_logs enable row level security;
alter table public.vehicle_component_rules enable row level security;

-- Kebijakan RLS Vehicles
drop policy if exists "vehicles_own_all" on public.vehicles;
create policy "vehicles_own_all" on public.vehicles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Kebijakan RLS Fuel Logs
drop policy if exists "fuel_logs_own_all" on public.vehicle_fuel_logs;
create policy "fuel_logs_own_all" on public.vehicle_fuel_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Kebijakan RLS Maintenance Logs
drop policy if exists "maint_logs_own_all" on public.vehicle_maintenance_logs;
create policy "maint_logs_own_all" on public.vehicle_maintenance_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Kebijakan RLS Rules
drop policy if exists "vehicle_rules_select_auth" on public.vehicle_component_rules;
create policy "vehicle_rules_select_auth" on public.vehicle_component_rules
  for select to authenticated
  using (true);

-- Trigger Sinkronisasi Odometer Otomatis
create or replace function public.sync_vehicle_odometer()
returns trigger
language plpgsql
as $$
declare
  v_vehicle_id uuid;
  v_max_odo numeric(10, 2);
begin
  v_vehicle_id := coalesce(new.vehicle_id, old.vehicle_id);

  select greatest(
    coalesce((select max(odometer_km) from public.vehicle_fuel_logs where vehicle_id = v_vehicle_id), 0),
    coalesce((select max(odometer_km) from public.vehicle_maintenance_logs where vehicle_id = v_vehicle_id), 0)
  ) into v_max_odo;

  if v_max_odo > 0 then
    update public.vehicles
    set total_odometer_km = greatest(total_odometer_km, v_max_odo)
    where id = v_vehicle_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_odo_fuel on public.vehicle_fuel_logs;
create trigger trg_sync_odo_fuel
  after insert or update of odometer_km or delete on public.vehicle_fuel_logs
  for each row execute function public.sync_vehicle_odometer();

drop trigger if exists trg_sync_odo_maint on public.vehicle_maintenance_logs;
create trigger trg_sync_odo_maint
  after insert or update of odometer_km or delete on public.vehicle_maintenance_logs
  for each row execute function public.sync_vehicle_odometer();

-- Seed Aturan Interval Perawatan Skutik (Honda Vario 110 eSP)
insert into public.vehicle_component_rules
  (category_name, badge_label, description, default_max_km, default_max_months, warn_threshold_pct, crit_threshold_pct)
values
  ('Oli Mesin (Engine Oil)', 'ENGINE', 'Penggantian oli mesin rutin 0.8L', 2500, 2, 80, 95),
  ('Oli Gardan (Gear Oil)', 'DRIVETRAIN', 'Oli transmisi CVT 120ml', 8000, 8, 80, 95),
  ('V-Belt & Roller CVT', 'CVT', 'Sabuk penggerak CVT & pemberat roller', 24000, 24, 80, 95),
  ('Filter Udara (Air Filter)', 'ENGINE', 'Elemen saringan udara tipe viscous', 16000, 16, 75, 90),
  ('Busi (Spark Plug)', 'IGNITION', 'Busi standar / iridium pembakaran', 8000, 12, 75, 90),
  ('Kampas Rem Depan', 'BRAKES', 'Brake pad cakram depan', 12000, 12, 75, 90),
  ('Kampas Rem Belakang', 'BRAKES', 'Brake shoe tromol belakang', 18000, 18, 75, 90),
  ('Ban Depan & Belakang', 'TIRES', 'Ketebalan alur ban tubeless', 15000, 24, 75, 90)
on conflict (category_name) do nothing;
