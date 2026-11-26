-- ============================================================================
-- Vehicle Logbook — Supabase PostgreSQL Schema, Fuel Prices Master & RLS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Fuel Prices Reference Table (Indonesia — Jabodetabek / Jawa)
CREATE TABLE IF NOT EXISTS public.fuel_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL CHECK (char_length(trim(brand)) > 0),
  product_name TEXT NOT NULL UNIQUE CHECK (char_length(trim(product_name)) > 0),
  spec_label TEXT NOT NULL DEFAULT '',
  price_per_liter NUMERIC(10, 2) NOT NULL CHECK (price_per_liter > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 100,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_prices_active_sort
  ON public.fuel_prices(is_active, sort_order ASC, brand ASC);

-- 2. Vehicles Table
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

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS plate_number TEXT DEFAULT '';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS brand_model TEXT DEFAULT '';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS fuel_type TEXT DEFAULT 'Pertamax';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS tank_capacity_liters NUMERIC(6, 2) DEFAULT 3.70;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS initial_odometer_km NUMERIC(10, 1) DEFAULT 0;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS current_odometer_km NUMERIC(10, 1) DEFAULT 0;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles(user_id);

-- 3. Fuel Logs Table
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

ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE;
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS logged_at DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS odometer_km NUMERIC(10, 1) DEFAULT 0;
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS liters NUMERIC(7, 3) DEFAULT 0;
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS price_per_liter NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS total_cost NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS fuel_brand TEXT DEFAULT 'Pertamax';
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS station_name TEXT DEFAULT '';
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS is_full_tank BOOLEAN DEFAULT true;
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle_date ON public.fuel_logs(vehicle_id, logged_at DESC, odometer_km DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_user_id ON public.fuel_logs(user_id);

-- 4. Maintenance Logs Table
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

ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS logged_at DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS odometer_km NUMERIC(10, 1) DEFAULT 0;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS workshop_name TEXT DEFAULT '';
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS total_cost NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS next_due_km NUMERIC(10, 1);
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_vehicle_date ON public.maintenance_logs(vehicle_id, logged_at DESC, odometer_km DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_user_id ON public.maintenance_logs(user_id);

-- 5. Relax NOT NULL constraints on any legacy columns from older schema versions
DO $$ DECLARE rec RECORD; BEGIN FOR rec IN SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('vehicles', 'fuel_logs', 'maintenance_logs') AND is_nullable = 'NO' AND column_name NOT IN ( 'id', 'user_id', 'vehicle_id', 'name', 'logged_at', 'odometer_km', 'liters', 'price_per_liter', 'total_cost', 'title' ) LOOP EXECUTE format( 'ALTER TABLE public.\%I ALTER COLUMN \%I DROP NOT NULL', rec.table_name, rec.column_name ); END LOOP; END; $$;

-- 6. Triggers: Auto-update updated_at & sync highest odometer reading to vehicles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_fuel_prices_updated_at ON public.fuel_prices;
CREATE TRIGGER trg_fuel_prices_updated_at
BEFORE UPDATE ON public.fuel_prices
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER trg_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_vehicle_odometer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$ BEGIN UPDATE public.vehicles SET current_odometer_km = GREATEST(COALESCE(current_odometer_km, 0), NEW.odometer_km), updated_at = now() WHERE id = NEW.vehicle_id; RETURN NEW; END; $$;

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

-- 7. Seed Indonesian Fuel Prices (Jabodetabek / Jawa — dapat diedit langsung di Table Editor)
INSERT INTO public.fuel_prices (brand, product_name, spec_label, price_per_liter, is_active, sort_order)
VALUES
  ('Pertamina', 'Pertamax', 'RON 92', 12100, true, 10),
  ('Pertamina', 'Pertalite', 'RON 90', 10000, true, 20),
  ('Pertamina', 'Pertamax Green 95', 'RON 95', 13150, true, 30),
  ('Pertamina', 'Pertamax Turbo', 'RON 98', 13500, true, 40),
  ('Pertamina', 'Dexlite', 'CN 51', 13050, true, 50),
  ('Pertamina', 'Pertamina Dex', 'CN 53', 13400, true, 60),
  ('Shell', 'Shell Super', 'RON 92', 12290, true, 70),
  ('Shell', 'Shell V-Power', 'RON 95', 13340, true, 80),
  ('Shell', 'Shell V-Power Nitro+', 'RON 98', 13570, true, 90),
  ('Shell', 'Shell V-Power Diesel', 'CN 51', 13900, true, 100),
  ('BP', 'BP 92', 'RON 92', 12290, true, 110),
  ('BP', 'BP Ultimate', 'RON 95', 13340, true, 120),
  ('Vivo', 'Revvo 90', 'RON 90', 11900, true, 130),
  ('Vivo', 'Revvo 92', 'RON 92', 12200, true, 140),
  ('Vivo', 'Revvo 95', 'RON 95', 13200, true, 150)
ON CONFLICT (product_name) DO NOTHING;

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Fuel Prices Policy (Authenticated users can read catalog; manage prices in Supabase Dashboard)
DROP POLICY IF EXISTS "fuel_prices_select_authenticated" ON public.fuel_prices;
CREATE POLICY "fuel_prices_select_authenticated" ON public.fuel_prices
  FOR SELECT USING (auth.role() = 'authenticated');

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

-- 9. Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';