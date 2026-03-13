import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("INTERNAL_SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("INTERNAL_SERVICE_ROLE_KEY");
    const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID");
    const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing config" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const daysBack = body.days || 1;
    const after = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60);
    const targetUserId = typeof body.userId === 'string' ? body.userId : null;

    let query = supabase.from("user_integrations").select("*");
    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data: integrations, error: intErr } = await query;
    if (intErr) throw intErr;

    const summary = [];

    // Process each integration
    for (const integration of integrations) {
      const { user_id, service } = integration;
      let result = { user_id, service, status: "pending" };

      // STRAVA SYNC
      if (service === 'strava' && STRAVA_CLIENT_ID && STRAVA_CLIENT_SECRET) {
        try {
          const refreshRes = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              client_id: STRAVA_CLIENT_ID, 
              client_secret: STRAVA_CLIENT_SECRET, 
              refresh_token: integration.refresh_token, 
              grant_type: 'refresh_token' 
            })
          });

          const tokenData = await refreshRes.json();
          if (refreshRes.ok) {
            const accessToken = tokenData.access_token;
            
            // Update stored token
            await supabase.from('user_integrations').update({ 
              access_token: tokenData.access_token, 
              refresh_token: tokenData.refresh_token, 
              meta: {
                ...(integration.meta ?? {}),
                expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
              }
            }).eq('id', integration.id);

            // Fetch activities
            const actRes = await fetch(
              `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200`, 
              { headers: { 'Authorization': `Bearer ${accessToken}` } }
            );
            const activities = await actRes.json();

            if (Array.isArray(activities) && activities.length > 0) {
              for (const act of activities) {
                await supabase.from('strava_activities').upsert({
                  id: act.id, 
                  user_id, 
                  name: act.name, 
                  type: act.type, 
                  distance: act.distance,
                  moving_time: act.moving_time, 
                  start_date: act.start_date, 
                  total_elevation_gain: act.total_elevation_gain,
                  average_heartrate: act.average_heartrate, 
                  max_heartrate: act.max_heartrate, 
                  suffer_score: act.suffer_score ?? null
                }, { onConflict: 'id' });
              }
              result.status = `success (${activities.length} activities)`;
            } else {
              result.status = "success (0 activities)";
            }
          } else {
            result.status = `error: ${tokenData.message}`;
          }
        } catch (e) { 
          result.status = `error: ${e.message}`;
        }
      }

      summary.push(result);
    }

    return new Response(JSON.stringify({ summary, timestamp: new Date().toISOString() }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
