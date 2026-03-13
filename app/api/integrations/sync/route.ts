import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/crypto'

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const authHeader = request.headers.get('authorization')
    let accessToken: string | null = null

    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      accessToken = authHeader.slice(7).trim()
    }

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Sync backend is not configured.' },
        { status: 500 }
      )
    }

    const tokenClient = createSupabaseClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
    let user: { id: string } | null = null

    if (accessToken) {
      const { data: tokenUser, error: tokenError } = await tokenClient.auth.getUser(accessToken)
      if (!tokenError && tokenUser.user) {
        user = { id: tokenUser.user.id }
      }
    }

    if (!user) {
      const supabase = createClient()
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = { id: data.user.id }
      const { data: { session } } = await supabase.auth.getSession()
      accessToken = session?.access_token ?? null
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized: missing access token' }, { status: 401 })
    }

    const results: { service: string; status: string }[] = []

    // ── 1. Strava sync via Edge Function ──
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    try {
      const edgeRes = await fetch(`https://${projectRef}.supabase.co/functions/v1/garmin-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId: user.id, days: 1 }),
      })
      const edgePayload = await edgeRes.text()
      let parsed: any = {}
      try { parsed = JSON.parse(edgePayload) } catch { /* empty */ }

      if (edgeRes.ok && Array.isArray(parsed.summary)) {
        for (const s of parsed.summary) {
          results.push({ service: s.service ?? 'strava', status: s.status ?? 'done' })
        }
      } else {
        results.push({ service: 'strava', status: parsed.error ?? `HTTP ${edgeRes.status}` })
      }
    } catch (e: unknown) {
      results.push({ service: 'strava', status: e instanceof Error ? e.message : 'edge function error' })
    }

    // ── 2. Garmin daily sync via garmin-connect (server-side scrape) ──
    if (serviceRoleKey) {
      try {
        const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

        const { data: garminInt } = await adminClient
          .from('user_integrations')
          .select('*')
          .eq('user_id', user.id)
          .eq('service', 'garmin')
          .single()

        if (garminInt) {
          const email = garminInt.meta?.encrypted
            ? decrypt(garminInt.access_token)
            : garminInt.access_token
          const password = garminInt.meta?.encrypted
            ? decrypt(garminInt.refresh_token)
            : garminInt.refresh_token

          if (email && password) {
            const { GarminConnect } = await import('garmin-connect')
            const gClient: any = new GarminConnect({ username: email, password })
            await gClient.login()

            const rows: any[] = []
            for (let i = 0; i < 2; i++) {
              const d = new Date()
              d.setDate(d.getDate() - i)
              const dateStr = d.toISOString().split('T')[0]

              const [sleepRes, hrvRes, wellnessRes] = await Promise.allSettled([
                gClient.getSleepData(new Date(dateStr)),
                typeof gClient.getHeartRateVariability === 'function' ? gClient.getHeartRateVariability(new Date(dateStr)) : Promise.reject('N/A'),
                typeof gClient.getDailyWellness === 'function' ? gClient.getDailyWellness(new Date(dateStr)) : Promise.reject('N/A'),
              ])

              const sleepData = sleepRes.status === 'fulfilled' ? sleepRes.value : null
              const hrvData = hrvRes.status === 'fulfilled' ? hrvRes.value : null
              const wellnessData = wellnessRes.status === 'fulfilled' ? wellnessRes.value : null

              const row = {
                user_id: user.id,
                date: dateStr,
                sleep_score: (sleepData as any)?.dailySleepDTO?.sleepScore ??
                  (sleepData as any)?.dailySleepDTO?.sleepScores?.overall?.value ?? null,
                hrv_rmssd: (hrvData as any)?.hrvSummary?.lastNightAvg ??
                  (hrvData as any)?.hrvSummary?.rmssd ?? null,
                body_battery_high: (wellnessData as any)?.bodyBatteryHighLevel ??
                  (wellnessData as any)?.bodyBatteryMostRecentValue ?? null,
                body_battery_low: (wellnessData as any)?.bodyBatteryLowLevel ?? null,
                avg_stress: (wellnessData as any)?.averageStressLevel ??
                  (wellnessData as any)?.avgStressLevel ?? null,
                steps: (wellnessData as any)?.totalSteps ?? null,
                synced_at: new Date().toISOString(),
              }

              if (row.sleep_score != null || row.hrv_rmssd != null || row.body_battery_high != null) {
                rows.push(row)
              }
            }

            if (rows.length > 0) {
              const { error: upsertErr } = await adminClient.from('garmin_daily').upsert(rows)
              results.push({ service: 'garmin', status: upsertErr ? upsertErr.message : `success (${rows.length} days)` })
            } else {
              results.push({ service: 'garmin', status: 'success (0 new rows)' })
            }
          } else {
            results.push({ service: 'garmin', status: 'credential decryption failed' })
          }
        } else {
          results.push({ service: 'garmin', status: 'not connected' })
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'unknown error'
        console.error('Garmin sync error:', msg)
        results.push({ service: 'garmin', status: msg })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed (${results.length} integration${results.length === 1 ? '' : 's'} processed).`,
      results,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error'
    console.error('Sync route error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
