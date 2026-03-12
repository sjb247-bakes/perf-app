# Deploy: garmin-sync Edge Function

## One-time Setup

### 1. Install Supabase CLI
```powershell
winget install Supabase.CLI
# or via scoop:
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2. Login & link project
```powershell
supabase login
cd E:\dev\perf-app
supabase link --project-ref logqawepzcjniphiucce
```

### 3. Set Edge Function secrets
```powershell
supabase secrets set ENCRYPTION_SECRET="BtB+PWugp8vJILlDUl0aGpqgvxgd2bkzAbrMBV70A0c="
```

### 4. Deploy the function
```powershell
supabase functions deploy garmin-sync
```

### 5. Add DB constraint for upsert (run in Supabase SQL Editor)
```sql
alter table garmin_daily 
add constraint garmin_daily_user_id_date_key 
unique (user_id, date);
```

### 6. Schedule it daily (run in Supabase SQL Editor)
```sql
-- Enable pg_cron extension first (Dashboard > Database > Extensions > pg_cron)
select cron.schedule(
  'garmin-daily-sync',
  '0 3 * * *',  -- 3am UTC = 2pm AEDT
  $$
  select net.http_post(
    url := 'https://logqawepzcjniphiucce.supabase.co/functions/v1/garmin-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  )
  $$
);
```

## Manual Trigger (test it)
```powershell
curl -X POST https://logqawepzcjniphiucce.supabase.co/functions/v1/garmin-sync \
  -H "Authorization: Bearer <service_role_key>"
```
