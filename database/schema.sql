-- Enable UUID extension
create extension if not exists "pgcrypto";

-- 1. Vehicles table
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  model text not null default 'Honda Vario 110 eSP',
  license_plate text,
  fuel_type text not null default 'Pertamax',
  tank_capacity_liters numeric(6,2) not null default 3.70 check (tank_capacity_liters > 0),
  initial_odometer_km numeric(10,1) not null default 0 check (initial_odometer_km >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Fuel logs table
create table if not exists public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  logged_at date not null default current_date,
  odometer_km numeric(10,1) not null check (odometer_km >= 0),
  liters numeric(8,3) not null check (liters > 0),
  price_per_liter numeric(10,2) check (price_per_liter >= 0),
  total_cost numeric(12,2) not null check (total_cost >= 0),
  fuel_type text not null default 'Pertamax',
  is_full_tank boolean not null default true,
  station_name text,
  notes text,
  created_at timestamptz not null default now()
);

-- 3. Maintenance logs table
create table if not exists public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  service_date date not null default current_date,
  odometer_km numeric(10,1) not null check (odometer_km >= 0),
  service_type text not null,
  cost numeric(12,2) not null default 0 check (cost >= 0),
  workshop_name text,
  notes text,
  created_at timestamptz not null default now()
);

-- 4. Component schedules table (Jadwal Komponen)
create table if not exists public.component_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  component_name text not null,
  last_replaced_km numeric(10,1) not null default 0 check (last_replaced_km >= 0),
  interval_km numeric(10,1) not null default 2000 check (interval_km > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_vehicles_user_id on public.vehicles(user_id);
create index if not exists idx_fuel_logs_vehicle_odo on public.fuel_logs(vehicle_id, odometer_km asc, logged_at asc);
create index if not exists idx_fuel_logs_user_id on public.fuel_logs(user_id);
create index if not exists idx_maintenance_logs_vehicle_date on public.maintenance_logs(vehicle_id, service_date desc);
create index if not exists idx_maintenance_logs_user_id on public.maintenance_logs(user_id);
create index if not exists idx_component_schedules_vehicle on public.component_schedules(vehicle_id);
create index if not exists idx_component_schedules_user_id on public.component_schedules(user_id);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_vehicles_updated_at on public.vehicles;
create trigger trg_vehicles_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

drop trigger if exists trg_component_schedules_updated_at on public.component_schedules;
create trigger trg_component_schedules_updated_at
before update on public.component_schedules
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.vehicles enable row level security;
alter table public.fuel_logs enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.component_schedules enable row level security;

-- RLS Policies: vehicles
drop policy if exists "vehicles_select_own" on public.vehicles;
create policy "vehicles_select_own" on public.vehicles for select using (auth.uid() = user_id);
drop policy if exists "vehicles_insert_own" on public.vehicles;
create policy "vehicles_insert_own" on public.vehicles for insert with check (auth.uid() = user_id);
drop policy if exists "vehicles_update_own" on public.vehicles;
create policy "vehicles_update_own" on public.vehicles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "vehicles_delete_own" on public.vehicles;
create policy "vehicles_delete_own" on public.vehicles for delete using (auth.uid() = user_id);

-- RLS Policies: fuel_logs
drop policy if exists "fuel_logs_select_own" on public.fuel_logs;
create policy "fuel_logs_select_own" on public.fuel_logs for select using (auth.uid() = user_id);
drop policy if exists "fuel_logs_insert_own" on public.fuel_logs;
create policy "fuel_logs_insert_own" on public.fuel_logs for insert with check (auth.uid() = user_id);
drop policy if exists "fuel_logs_update_own" on public.fuel_logs;
create policy "fuel_logs_update_own" on public.fuel_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "fuel_logs_delete_own" on public.fuel_logs;
create policy "fuel_logs_delete_own" on public.fuel_logs for delete using (auth.uid() = user_id);

-- RLS Policies: maintenance_logs
drop policy if exists "maintenance_logs_select_own" on public.maintenance_logs;
create policy "maintenance_logs_select_own" on public.maintenance_logs for select using (auth.uid() = user_id);
drop policy if exists "maintenance_logs_insert_own" on public.maintenance_logs;
create policy "maintenance_logs_insert_own" on public.maintenance_logs for insert with check (auth.uid() = user_id);
drop policy if exists "maintenance_logs_update_own" on public.maintenance_logs;
create policy "maintenance_logs_update_own" on public.maintenance_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "maintenance_logs_delete_own" on public.maintenance_logs;
create policy "maintenance_logs_delete_own" on public.maintenance_logs for delete using (auth.uid() = user_id);

-- RLS Policies: component_schedules
drop policy if exists "component_schedules_select_own" on public.component_schedules;
create policy "component_schedules_select_own" on public.component_schedules for select using (auth.uid() = user_id);
drop policy if exists "component_schedules_insert_own" on public.component_schedules;
create policy "component_schedules_insert_own" on public.component_schedules for insert with check (auth.uid() = user_id);
drop policy if exists "component_schedules_update_own" on public.component_schedules;
create policy "component_schedules_update_own" on public.component_schedules for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "component_schedules_delete_own" on public.component_schedules;
create policy "component_schedules_delete_own" on public.component_schedules for delete using (auth.uid() = user_id);
