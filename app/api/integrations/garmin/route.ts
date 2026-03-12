import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
