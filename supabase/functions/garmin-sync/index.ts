import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { GarminConnect } from "npm:garmin-connect@1.4.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("INTERNAL_SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("INTERNAL_SERVICE_ROLE_KEY")!;
const ENCRYPTION_SECRET = Deno.env.get("ENCRYPTION_SECRET")!;
const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;

async function decrypt(ciphertext: string): Promise<string> {
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(".");
  const keyBytes = Uint8Array.from(atob(ENCRYPTION_SECRET), c => c.charCodeAt(0));
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
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const body = await req.json().catch(() => ({}));
  const daysBack = body.days || 1; 
  const after = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60);

  console.log(`🚀 Starting Daily Sync - Days back: ${daysBack}`);

  const { data: integrations, error: intErr } = await supabase.from("user_integrations").select("*");
  if (intErr) return new Response(JSON.stringify({ error: intErr.message }), { status: 500 });

  const results = [];
  const today = new Date().toISOString().split("T")[0];
  const users = [...new Set(integrations.map(i => i.user_id))];

  for (const user_id of users) {
    const userIntegrations = integrations.filter(i => i.user_id === user_id);
    const garmin = userIntegrations.find(i => i.service === 'garmin');
    const strava = userIntegrations.find(i => i.service === 'strava');

    // 1. GARMIN SYNC
    if (garmin) {
      try {
        const email = garmin.meta?.encrypted ? await decrypt(garmin.access_token) : garmin.access_token;
        const password = garmin.meta?.encrypted ? await decrypt(garmin.refresh_token) : garmin.refresh_token;
        const gc = new GarminConnect({ username: email, password });
        await gc.login();
        const [sleep, hrv, wellness] = await Promise.all([gc.getSleepData(today), gc.getHeartRateVariability(today), gc.getDailyWellness(today)]);
        await supabase.from("garmin_daily").upsert({
          user_id, date: today, sleep_score: sleep?.dailySleepDTO?.sleepScore ?? null,
          hrv_rmssd: hrv?.hrvSummary?.lastNightAvg ?? null,
          body_battery_high: wellness?.bodyBatteryHighLevel ?? null,
          body_battery_low: wellness?.bodyBatteryLowLevel ?? null,
          avg_stress: wellness?.averageStressLevel ?? null,
          synced_at: new Date().toISOString()
        });
        console.log(`✅ Garmin synced for ${user_id}`);
      } catch (e) { console.error(`❌ Garmin error:`, e.message); }
    }

    // 2. STRAVA SYNC
    if (strava) {
      try {
        const refreshRes = await fetch('https://www.strava.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: STRAVA_CLIENT_ID, client_secret: STRAVA_CLIENT_SECRET, refresh_token: strava.refresh_token, grant_type: 'refresh_token' })
        });
        const tokenData = await refreshRes.json();
        if (refreshRes.ok) {
          await supabase.from('user_integrations').update({ access_token: tokenData.access_token, refresh_token: tokenData.refresh_token, expires_at: new Date(tokenData.expires_at * 1000).toISOString() }).eq('id', strava.id);
          const actRes = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200`, {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
          });
          const activities = await actRes.json();
          if (Array.isArray(activities)) {
            for (const act of activities) {
              await supabase.from('strava_activities').upsert({
                id: act.id, user_id, name: act.name, type: act.type, distance: act.distance,
                moving_time: act.moving_time, start_date: act.start_date, total_elevation_gain: act.total_elevation_gain,
                average_heartrate: act.average_heartrate, max_heartrate: act.max_heartrate, suffer_score: act.suffer_score ?? null
              });
            }
            console.log(`✅ Strava synced ${activities.length} activities for ${user_id}`);
          }
        }
      } catch (e) { console.error(`❌ Strava error:`, e.message); }
    }
  }

  return new Response(JSON.stringify({ status: "success" }), { headers: { "Content-Type": "application/json" } });
});
