// Supabase client initialization with reliable fallback
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

if (SUPABASE_URL === 'https://placeholder.supabase.co') {
    console.warn('Supabase configuration missing in .env.local')
}

// Service role client for backend operations (bypass RLS)
export const getServiceRoleClient = () => {
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SERVICE_ROLE_KEY) {
        console.warn('SUPABASE_SERVICE_ROLE_KEY missing - backend updates may fail due to RLS')
        return supabase
    }
    return createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
}
