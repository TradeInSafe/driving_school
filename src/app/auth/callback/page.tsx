'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
    const router = useRouter()

    useEffect(() => {
        const handleAuthCallback = async () => {
            const searchParams = new URLSearchParams(window.location.search)
            const code = searchParams.get('code')
            const requestedRole = searchParams.get('role')

            console.log('Auth Callback started', { code: code ? 'present' : 'missing', requestedRole })

            if (code) {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
                if (exchangeError) {
                    console.error('Code exchange error:', exchangeError.message)
                    router.push('/signin?error=CodeExchangeFailed')
                    return
                }
            }

            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (sessionError || !session) {
                console.error('Session error or no session:', sessionError?.message)
                router.push('/signin?error=SessionNotFound')
                return
            }

            if (session) {
                const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || ''

                // Fetch current user profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single()

                let currentRole = profile?.role || 'student'
                if (requestedRole === 'instructor') currentRole = 'instructor'

                // Upsert profile to ensure it exists and has the correct role
                const { error: upsertError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: session.user.id,
                        full_name: profile?.full_name || fullName,
                        role: currentRole,
                        updated_at: new Date().toISOString()
                    })

                if (upsertError) {
                    console.error('Failed to upsert profile:', upsertError.message)
                }

                // Route accordingly
                if (currentRole === 'instructor') {
                    if (!profile?.bio || profile.bio.trim() === '') {
                        router.push('/onboarding/instructor')
                    } else {
                        router.push('/instructor')
                    }
                } else if (currentRole === 'admin') {
                    router.push('/admin')
                } else {
                    router.push('/dashboard')
                }

                router.refresh()
            }
        }

        handleAuthCallback()
    }, [router])

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground font-medium">Finalizing your sign in...</p>
        </div>
    )
}
