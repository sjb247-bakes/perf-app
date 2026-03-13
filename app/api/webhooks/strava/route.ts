import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 1. Strava Webhook Verification (GET)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const VERIFY_TOKEN = 'performance_app_secret'

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Strava Webhook Verified')
    return NextResponse.json({ 'hub.challenge': challenge })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// 2. Strava Activity Receiver (POST)
export async function POST(request: Request) {
  const body = await request.json()
  const { object_type, aspect_type, object_id, owner_id } = body

  // We only care about new activities
  if (object_type === 'activity' && aspect_type === 'create') {
    console.log(`🚀 New Strava activity detected: ${object_id} for athlete ${owner_id}`)

    const supabase = createClient()

    // 1. Find the user in our DB via their Strava Athlete ID (stored in meta)
    // Strava owner_id in webhook corresponds to athlete.id in token response
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('service', 'strava')
      .filter('meta->athlete->id', 'eq', owner_id)
      .single()

    if (integration) {
      try {
        let accessToken = integration.access_token

        // Check if token is expired
        const isExpired = integration.expires_at ? new Date(integration.expires_at) <= new Date() : true
        
        if (isExpired) {
          console.log('🔄 Token expired, refreshing for webhook...')
          const refreshRes = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: process.env.STRAVA_CLIENT_ID,
              client_secret: process.env.STRAVA_CLIENT_SECRET,
              refresh_token: integration.refresh_token,
              grant_type: 'refresh_token'
            })
          })
          const tokenData = await refreshRes.json()
          if (refreshRes.ok) {
            accessToken = tokenData.access_token
            await supabase.from('user_integrations').update({
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_at: new Date(tokenData.expires_at * 1000).toISOString()
            }).eq('id', integration.id)
          }
        }

        // 2. Fetch the full activity detail
        const res = await fetch(`https://www.strava.com/api/v3/activities/${object_id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        const act = await res.json()

        if (res.ok) {
          // 3. Save to database
          await supabase.from('strava_activities').upsert({
            id: act.id,
            user_id: integration.user_id,
            name: act.name,
            type: act.type,
            distance: act.distance,
            moving_time: act.moving_time,
            start_date: act.start_date,
            total_elevation_gain: act.total_elevation_gain,
            average_heartrate: act.average_heartrate,
            max_heartrate: act.max_heartrate,
            suffer_score: act.suffer_score ?? null
          })
          console.log(`✅ Webhook activity saved: ${act.name}`)
        }
      } catch (e) {
        console.error('❌ Webhook error:', e)
      }
    }
  }

  return NextResponse.json({ status: 'success' })
}
