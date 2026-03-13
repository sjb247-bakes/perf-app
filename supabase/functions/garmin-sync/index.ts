import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { GarminConnect } from "npm:garmin-connect@1.4.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function decrypt(ciphertext: string, secret: string): Promise<string> {
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(".");
  const keyBytes = Uint8Array.from(atob(secret), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const authTag = Uint8Array.from(atob(authTagB64), c => c.charCodeAt(0));
  const encrypted = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const combined = new Uint8Array(encrypted.length + authTag.length);
  combined.set(encrypted);
  combined.set(authTag, encrypted.length);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
  return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("INTERNAL_SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("INTERNAL_SERVICE_ROLE_KEY");
    const ENCRYPTION_SECRET = Deno.env.get("ENCRYPTION_SECRET");
    const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID");
    const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ENCRYPTION_SECRET) {
      return new Response(JSON.stringify({ error: "Config missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const daysBack = body.days || 1;
    const after = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60);
    const today = new Date().toISOString().split("T")[0];

    const { data: integrations, error: intErr } = await supabase.from("user_integrations").select("*");
    if (intErr) throw intErr;

    const summary = [];
    for (const integration of integrations) {
      const { user_id, service } = integration;
      let result = { user_id, service, status: "pending" };

      if (service === 'garmin') {
        try {
          const email = integration.meta?.encrypted ? await decrypt(integration.access_token, ENCRYPTION_SECRET) : integration.access_token;
          const password = integration.meta?.encrypted ? await decrypt(integration.refresh_token, ENCRYPTION_SECRET) : integration.refresh_token;
          const gc = new GarminConnect({ username: email, password });
          await gc.login();
          const [sleep, hrv, wellness] = await Promise.all([gc.getSleepData(today), gc.getHeartRateVariability(today), gc.getDailyWellness(today)]);
          
          await supabase.from("garmin_daily").upsert({
            user_id, date: today,
            sleep_score: sleep?.dailySleepDTO?.sleepScore ?? sleep?.dailySleepDTO?.sleepScores?.overall?.value ?? null,
            hrv_rmssd: hrv?.hrvSummary?.lastNightAvg ?? hrv?.hrvSummary?.rmssd ?? null,
            body_battery_high: wellness?.bodyBatteryHighLevel ?? wellness?.bodyBatteryMostRecentValue ?? null,
            body_battery_low: wellness?.bodyBatteryLowLevel ?? null,
            avg_stress: wellness?.averageStressLevel ?? wellness?.avgStressLevel ?? null,
            synced_at: new Date().toISOString()
          });
          result.status = "success";
        } catch (e) { result.status = `error: ${e.message}`; }
      }

      if (service === 'strava' && STRAVA_CLIENT_ID && STRAVA_CLIENT_SECRET) {
        try {
          const refreshRes = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: STRAVA_CLIENT_ID, client_secret: STRAVA_CLIENT_SECRET, refresh_token: integration.refresh_token, grant_type: 'refresh_token' })
          });
          const tokenData = await refreshRes.json();
          if (refreshRes.ok) {
            const accessToken = tokenData.access_token;
            await supabase.from('user_integrations').update({ access_token: tokenData.access_token, refresh_token: tokenData.refresh_token, expires_at: new Date(tokenData.expires_at * 1000).toISOString() }).eq('id', integration.id);
            const actRes = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            const activities = await actRes.json();
            if (Array.isArray(activities)) {
              for (const act of activities) {
                await supabase.from('strava_activities').upsert({
                  id: act.id, user_id, name: act.name, type: act.type, distance: act.distance,
                  moving_time: act.moving_time, start_date: act.start_date, total_elevation_gain: act.total_elevation_gain,
                  average_heartrate: act.average_heartrate, max_heartrate: act.max_heartrate, suffer_score: act.suffer_score ?? null
                });
              }
              result.status = `success (${activities.length} activities)`;
            }
          }
        } catch (e) { result.status = `error: ${e.message}`; }
      }
      summary.push(result);
    }

    return new Response(JSON.stringify({ summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
