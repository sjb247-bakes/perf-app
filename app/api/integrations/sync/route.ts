import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    // Get the bearer token from Authorization header
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Missing or invalid Authorization header'
      }, { status: 401 })
    }

    const token = authHeader.substring(7) // Remove "Bearer " prefix
    const supabase = createClient()

    // Verify the token by getting the user
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('Auth error:', error?.message)
      return NextResponse.json({ 
        error: 'Invalid JWT token. Please log in again.',
        message: 'Session expired or invalid'
      }, { status: 401 })
    }

    // TODO: Here you would trigger the actual backfill/sync process
    // For now, return success message
    return NextResponse.json({
      success: true,
      message: '✓ Sync started. Garmin data will update shortly.',
      userId: user.id,
      email: user.email
    })

  } catch (err: any) {
    console.error('Sync route error:', err)
    return NextResponse.json({
      error: 'Server error during sync',
      details: err.message
    }, { status: 500 })
  }
}
