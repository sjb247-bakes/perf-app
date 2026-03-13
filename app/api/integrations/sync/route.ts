import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    let { data: { user }, error: authError } = await supabase.auth.getUser()
    let accessToken: string | null = null

    const authHeader = request.headers.get('authorization')
    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      accessToken = authHeader.slice(7).trim()
    }

    // Fallback for environments where route-handler cookies are flaky in dev.
    if (!user && accessToken) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (url && anonKey) {
        const tokenClient = createSupabaseClient(url, anonKey, { auth: { persistSession: false } })
        const { data: tokenUser, error: tokenError } = await tokenClient.auth.getUser(accessToken)
        if (!tokenError && tokenUser.user) {
          user = tokenUser.user
          authError = null
        }
      }
    }

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!accessToken) {
      const { data: { session } } = await supabase.auth.getSession()
      accessToken = session?.access_token ?? null
    }

    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1]
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!projectRef || !anonKey) {
      return NextResponse.json(
        { error: 'Sync backend is not configured. Missing Supabase URL or anon key.' },
        { status: 500 }
      )
    }

    const response = await fetch(`https://${projectRef}.supabase.co/functions/v1/garmin-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ userId: user.id, days: 1 }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = typeof payload?.error === 'string' ? payload.error : 'Remote sync failed'
      return NextResponse.json({ error: message }, { status: response.status })
    }

    return NextResponse.json({ success: true, message: 'Sync triggered successfully.' })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
