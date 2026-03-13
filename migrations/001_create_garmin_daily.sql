-- Create garmin_daily table
CREATE TABLE IF NOT EXISTS public.garmin_daily (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sleep_score SMALLINT,
  hrv_rmssd FLOAT,
  body_battery_high SMALLINT,
  body_battery_low SMALLINT,
  avg_stress SMALLINT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.garmin_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY IF NOT EXISTS "Users can read own garmin data"
  ON public.garmin_daily FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own garmin data"
  ON public.garmin_daily FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Service role can insert"
  ON public.garmin_daily FOR INSERT
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_garmin_user_date ON public.garmin_daily(user_id, date DESC);
