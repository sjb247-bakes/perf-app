import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    
    // First check if there's an active session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError.message)
      return NextResponse.json({ 
        error: 'Failed to get session',
        details: sessionError.message 
      }, { status: 401 })
    }

    if (!session) {
      console.error('No active session found')
      return NextResponse.json({ 
        error: 'No active session. Please log in first.',
        hint: 'Check /api/debug/session to verify your session'
      }, { status: 401 })
    }

    const user = session.user
    if (!user) {
      return NextResponse.json({ error: 'User not found in session' }, { status: 401 })
    }

    let payload: Record<string, unknown> = {}
    const contentType = req.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      const rawBody = await req.text()
      if (rawBody.trim().length > 0) {
        try {
          payload = JSON.parse(rawBody)
        } catch {
          return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
        }
      }
    }

    const email = typeof payload.email === 'string' ? payload.email.trim() : ''
    const password = typeof payload.password === 'string' ? payload.password : ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Encrypt credentials server-side before storing
    const encryptedEmail = encrypt(email)
    const encryptedPassword = encrypt(password)

    const { error } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: user.id,
        service: 'garmin',
        access_token: encryptedEmail,
        refresh_token: encryptedPassword,
        meta: { updated_at: new Date().toISOString(), encrypted: true }
      }, { onConflict: 'user_id,service' })

    if (error) {
      console.error('DB error saving Garmin integration:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Garmin integration route error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
