import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    return NextResponse.json({
      session: {
        active: !!session,
        user: session?.user?.email || null,
        expiresAt: session?.expires_at || null,
      },
      user: {
        id: user?.id || null,
        email: user?.email || null,
      },
      errors: {
        sessionError: sessionError?.message || null,
        userError: userError?.message || null,
      },
      message: session ? '✅ Session is active' : '❌ No active session'
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      message: '💥 Server error checking session'
    }, { status: 500 })
  }
}
