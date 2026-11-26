-- ============================================================================
-- Vehicle Logbook — Supabase PostgreSQL Schema & Row Level Security (RLS)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Vehicles Table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  plate_number TEXT DEFAULT '',
  brand_model TEXT DEFAULT '',
  fuel_type TEXT NOT NULL DEFAULT 'Pertamax',
  tank_capacity_liters NUMERIC(6, 2) NOT NULL DEFAULT 3.70 CHECK (tank_capacity_liters > 0),
  initial_odometer_km NUMERIC(10, 1) NOT NULL DEFAULT 0 CHECK (initial_odometer_km >= 0),
  current_odometer_km NUMERIC(10, 1) NOT NULL DEFAULT 0 CHECK (current_odometer_km >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles(user_id);

-- 2. Fuel Logs Table
CREATE TABLE IF NOT EXISTS public.fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  odometer_km NUMERIC(10, 1) NOT NULL CHECK (odometer_km >= 0),
  liters NUMERIC(7, 3) NOT NULL CHECK (liters > 0),
  price_per_liter NUMERIC(10, 2) NOT NULL CHECK (price_per_liter >= 0),
  total_cost NUMERIC(12, 2) NOT NULL CHECK (total_cost >= 0),
  fuel_brand TEXT NOT NULL DEFAULT 'Pertamax',
  station_name TEXT DEFAULT '',
  is_full_tank BOOLEAN NOT NULL DEFAULT true,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle_date ON public.fuel_logs(vehicle_id, logged_at DESC, odometer_km DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_user_id ON public.fuel_logs(user_id);

-- 3. Maintenance Logs Table
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  odometer_km NUMERIC(10, 1) NOT NULL CHECK (odometer_km >= 0),
  category TEXT NOT NULL DEFAULT 'other' CHECK (
    category IN ('oil_change', 'cvt_belt', 'tires', 'brakes', 'battery', 'tune_up', 'other')
  ),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  workshop_name TEXT DEFAULT '',
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  next_due_km NUMERIC(10, 1) NULL CHECK (next_due_km IS NULL OR next_due_km >= 0),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_vehicle_date ON public.maintenance_logs(vehicle_id, logged_at DESC, odometer_km DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_user_id ON public.maintenance_logs(user_id);

-- 4. Triggers: Auto-update updated_at & sync highest odometer reading to vehicles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER trg_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_vehicle_odometer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.vehicles
  SET current_odometer_km = GREATEST(current_odometer_km, NEW.odometer_km),
      updated_at = now()
  WHERE id = NEW.vehicle_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fuel_logs_sync_odometer ON public.fuel_logs;
CREATE TRIGGER trg_fuel_logs_sync_odometer
AFTER INSERT OR UPDATE OF odometer_km ON public.fuel_logs
FOR EACH ROW
EXECUTE FUNCTION public.sync_vehicle_odometer();

DROP TRIGGER IF EXISTS trg_maintenance_logs_sync_odometer ON public.maintenance_logs;
CREATE TRIGGER trg_maintenance_logs_sync_odometer
AFTER INSERT OR UPDATE OF odometer_km ON public.maintenance_logs
FOR EACH ROW
EXECUTE FUNCTION public.sync_vehicle_odometer();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Vehicles Policies
DROP POLICY IF EXISTS "vehicles_select_own" ON public.vehicles;
CREATE POLICY "vehicles_select_own" ON public.vehicles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "vehicles_insert_own" ON public.vehicles;
CREATE POLICY "vehicles_insert_own" ON public.vehicles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "vehicles_update_own" ON public.vehicles;
CREATE POLICY "vehicles_update_own" ON public.vehicles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "vehicles_delete_own" ON public.vehicles;
CREATE POLICY "vehicles_delete_own" ON public.vehicles
  FOR DELETE USING (auth.uid() = user_id);

-- Fuel Logs Policies
DROP POLICY IF EXISTS "fuel_logs_select_own" ON public.fuel_logs;
CREATE POLICY "fuel_logs_select_own" ON public.fuel_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fuel_logs_insert_own" ON public.fuel_logs;
CREATE POLICY "fuel_logs_insert_own" ON public.fuel_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fuel_logs_update_own" ON public.fuel_logs;
CREATE POLICY "fuel_logs_update_own" ON public.fuel_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fuel_logs_delete_own" ON public.fuel_logs;
CREATE POLICY "fuel_logs_delete_own" ON public.fuel_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Maintenance Logs Policies
DROP POLICY IF EXISTS "maintenance_logs_select_own" ON public.maintenance_logs;
CREATE POLICY "maintenance_logs_select_own" ON public.maintenance_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "maintenance_logs_insert_own" ON public.maintenance_logs;
CREATE POLICY "maintenance_logs_insert_own" ON public.maintenance_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "maintenance_logs_update_own" ON public.maintenance_logs;
CREATE POLICY "maintenance_logs_update_own" ON public.maintenance_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "maintenance_logs_delete_own" ON public.maintenance_logs;
CREATE POLICY "maintenance_logs_delete_own" ON public.maintenance_logs
  FOR DELETE USING (auth.uid() = user_id);
