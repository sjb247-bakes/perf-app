import { createClient } from '@/lib/supabase/client'

// Re-export the browser client for use in client components
export const supabase = createClient()
