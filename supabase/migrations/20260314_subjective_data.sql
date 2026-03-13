-- Consolidated migration for subjective logs and user profiles
-- With proper RLS policies following Supabase best practices

-- 1. Create subjective_logs table (safe with IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.subjective_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  physical_energy SMALLINT NOT NULL CHECK (physical_energy BETWEEN 1 AND 10),
  mental_focus SMALLINT NOT NULL CHECK (mental_focus BETWEEN 1 AND 10),
  stress_level SMALLINT CHECK (stress_level BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 2. Drop and recreate user_profiles to fix existing schema issues
DROP TABLE IF EXISTS public.user_profiles CASCADE;

CREATE TABLE public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  job_type TEXT CHECK (job_type IN ('physical', 'desk', 'hybrid')),
  baseline_activity_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
 NEW.updated_at = NOW();
 RETURN NEW;
END;
$$;

-- 4. Create trigger for user_profiles
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- 5. Enable RLS
ALTER TABLE public.subjective_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 6. Subjective Logs Policies (explicit per operation)
CREATE POLICY subjective_logs_select ON public.subjective_logs
 FOR SELECT TO authenticated
 USING ((SELECT auth.uid()) = user_id);

CREATE POLICY subjective_logs_insert ON public.subjective_logs
 FOR INSERT TO authenticated
 WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY subjective_logs_update ON public.subjective_logs
 FOR UPDATE TO authenticated
 USING ((SELECT auth.uid()) = user_id)
 WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY subjective_logs_delete ON public.subjective_logs
 FOR DELETE TO authenticated
 USING ((SELECT auth.uid()) = user_id);

-- 7. User Profiles Policies (explicit per operation)
CREATE POLICY user_profiles_select ON public.user_profiles
 FOR SELECT TO authenticated
 USING ((SELECT auth.uid()) = user_id);

CREATE POLICY user_profiles_insert ON public.user_profiles
 FOR INSERT TO authenticated
 WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY user_profiles_update ON public.user_profiles
 FOR UPDATE TO authenticated
 USING ((SELECT auth.uid()) = user_id)
 WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY user_profiles_delete ON public.user_profiles
 FOR DELETE TO authenticated
 USING ((SELECT auth.uid()) = user_id);
