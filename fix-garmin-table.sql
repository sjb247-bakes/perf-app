-- Add missing columns to garmin_daily table
ALTER TABLE public.garmin_daily 
ADD COLUMN IF NOT EXISTS sleep_score SMALLINT,
ADD COLUMN IF NOT EXISTS hrv_rmssd FLOAT,
ADD COLUMN IF NOT EXISTS body_battery_high SMALLINT,
ADD COLUMN IF NOT EXISTS body_battery_low SMALLINT,
ADD COLUMN IF NOT EXISTS avg_stress SMALLINT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_garmin_user_date ON public.garmin_daily(user_id, date DESC);
