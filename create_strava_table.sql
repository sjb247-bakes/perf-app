CREATE TABLE IF NOT EXISTS strava_activities (
  id BIGINT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  type TEXT,
  distance FLOAT,
  moving_time INTEGER,
  start_date TIMESTAMPTZ,
  total_elevation_gain FLOAT,
  average_heartrate FLOAT,
  max_heartrate FLOAT,
  suffer_score FLOAT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE strava_activities ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own activities
CREATE POLICY \
Users
can
view
own
strava
activities\ ON strava_activities
  FOR SELECT USING (auth.uid() = user_id);

-- Allow admins to see everything
CREATE POLICY \Admins
can
view
all
strava
activities\ ON strava_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );
