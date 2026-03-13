import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${origin}/integrations?error=${error}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/integrations?error=No code provided`)
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  try {
    // Exchange code for tokens
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Strava token exchange failed:', data)
      throw new Error(data.message || 'Token exchange failed')
    }

    // Save tokens to Supabase
    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: user.id,
        service: 'strava',
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: new Date(data.expires_at * 1000).toISOString(),
        meta: {
          athlete: data.athlete,
          scope: searchParams.get('scope'),
        }
      }, { onConflict: 'user_id,service' })

    if (upsertError) throw upsertError

    return NextResponse.redirect(`${origin}/integrations?success=Strava connected!`)
  } catch (e: any) {
    console.error('Strava Callback Error:', e)
    return NextResponse.redirect(`${origin}/integrations?error=${encodeURIComponent(e.message)}`)
  }
}
