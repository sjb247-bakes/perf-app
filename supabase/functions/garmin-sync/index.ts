// Supabase Edge Function: garmin-sync
// Runs daily to pull Garmin Connect data for all users with connected accounts
// Deploy: supabase functions deploy garmin-sync
// Schedule: set up via Supabase Dashboard > Database > Extensions > pg_cron

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GarminConnect } from "npm:garmin-connect";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENCRYPTION_SECRET = Deno.env.get("ENCRYPTION_SECRET")!;

// --- AES-256-GCM Decrypt (mirrors lib/crypto.ts) ---
async function decrypt(ciphertext: string): Promise<string> {
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(".");
  const keyBytes = Uint8Array.from(atob(ENCRYPTION_SECRET), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const authTag = Uint8Array.from(atob(authTagB64), c => c.charCodeAt(0));
  const encrypted = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]
  );

  // Combine encrypted + authTag (WebCrypto AES-GCM expects them concatenated)
  const combined = new Uint8Array(encrypted.length + authTag.length);
  combined.set(encrypted);
  combined.set(authTag, encrypted.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv }, key, combined
  );

  return new TextDecoder().decode(decrypted);
}

// --- Main handler ---
Deno.serve(async (req) => {
  // Allow manual triggers via POST, and scheduled invocations
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("Starting Garmin sync...");

  // Get all users with a Garmin integration
  const { data: integrations, error: intErr } = await supabase
    .from("user_integrations")
    .select("user_id, access_token, refresh_token, meta")
    .eq("service", "garmin");

  if (intErr || !integrations?.length) {
    console.error("No Garmin integrations found:", intErr?.message);
    return new Response(JSON.stringify({ error: "No integrations found" }), { status: 404 });
  }

  const results = [];

  for (const integration of integrations) {
    const { user_id, access_token, refresh_token, meta } = integration;

    try {
      // Decrypt credentials
      const isEncrypted = meta?.encrypted === true;
      const email = isEncrypted ? await decrypt(access_token) : access_token;
      const password = isEncrypted ? await decrypt(refresh_token) : refresh_token;

      console.log(`Syncing data for user ${user_id}...`);

      // Connect to Garmin
      const gc = new GarminConnect({ username: email, password });
      await gc.login();

      // Fetch today's data
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const userInfo = await gc.getUserInfo();
      const displayName = userInfo?.displayName;

      // Fetch metrics
      const [sleepData, hrvData, wellnessData] = await Promise.allSettled([
        gc.getSleepData(displayName, today),
        gc.getHrvData(today),
        gc.getDailyWellness(today),
      ]);

      const sleep = sleepData.status === "fulfilled" ? sleepData.value : null;
      const hrv = hrvData.status === "fulfilled" ? hrvData.value : null;
      const wellness = wellnessData.status === "fulfilled" ? wellnessData.value : null;

      // Build the row
      const row = {
        user_id,
        date: today,
        sleep_score: sleep?.dailySleepDTO?.sleepScores?.overall?.value ?? null,
        hrv_rmssd: hrv?.hrvSummary?.rmssd ?? null,
        body_battery_high: wellness?.bodyBatteryHighLevel ?? null,
        body_battery_low: wellness?.bodyBatteryLowLevel ?? null,
        avg_stress: wellness?.averageStressLevel ?? null,
        resting_hr: wellness?.restingHeartRate ?? null,
        steps: wellness?.totalSteps ?? null,
        synced_at: new Date().toISOString(),
      };

      // Upsert into garmin_daily
      const { error: upsertErr } = await supabase
        .from("garmin_daily")
        .upsert(row, { onConflict: "user_id,date" });

      if (upsertErr) {
        console.error(`Failed to upsert data for ${user_id}:`, upsertErr.message);
        results.push({ user_id, status: "error", error: upsertErr.message });
      } else {
        console.log(`Synced ${today} for user ${user_id} ✅`);
        results.push({ user_id, status: "success", date: today });
      }
    } catch (err: any) {
      console.error(`Error syncing user ${user_id}:`, err.message);
      results.push({ user_id, status: "error", error: err.message });
    }
  }

  return new Response(JSON.stringify({ synced: results }), {
    headers: { "Content-Type": "application/json" },
  });
});
