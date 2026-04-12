import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase'
import { createSessionToken, setSessionCookie } from '@/lib/session'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const stateParam = searchParams.get('state')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`

    let redirect = '/dashboard'
    try {
        if (stateParam) {
            const state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
            if (state.redirect) redirect = state.redirect
        }
    } catch { /* ignore */ }

    if (!code) {
        return NextResponse.redirect(`${appUrl}/signin?error=GoogleAuthFailed`)
    }

    try {
        // Exchange code for access token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri: `${appUrl}/api/auth/google/callback`,
                grant_type: 'authorization_code',
            }),
        })

        const tokens = await tokenRes.json()
        if (!tokenRes.ok || !tokens.access_token) {
            throw new Error('Failed to exchange code for tokens')
        }

        // Get Google user info
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        const googleUser = await userInfoRes.json()

        if (!googleUser.email) {
            throw new Error('No email returned from Google')
        }

        const db = getServiceRoleClient()
        const email = googleUser.email.toLowerCase()

        // Find existing user by google_id or email
        type UserRow = { id: string; email: string; full_name: string | null; google_id: string | null; phone: string | null; address: string | null; gender: string | null }
        let { data: user } = await db
            .from('users')
            .select('id, email, full_name, google_id, phone, address, gender')
            .or(`google_id.eq.${googleUser.sub},email.eq.${email}`)
            .maybeSingle() as { data: UserRow | null }

        if (!user) {
            // New user — create account (profile incomplete, will be filled in)
            const { data: newUser, error } = await db
                .from('users')
                .insert({
                    email,
                    google_id: googleUser.sub,
                    full_name: googleUser.name || email,
                })
                .select('id, email, full_name, google_id, phone, address, gender')
                .single() as { data: UserRow | null; error: any }

            if (error || !newUser) throw new Error('Failed to create user: ' + error?.message)
            user = newUser
        } else if (!user.google_id) {
            // Existing email user — link Google account
            await db.from('users').update({ google_id: googleUser.sub }).eq('id', user.id)
        }

        const token = await createSessionToken({ id: user.id, email: user.email, full_name: user.full_name })

        // If profile is incomplete, redirect to complete-profile page
        const profileIncomplete = !user.phone || !user.address || !user.gender
        const finalRedirect = profileIncomplete
            ? `${appUrl}/complete-profile?redirect=${encodeURIComponent(redirect)}`
            : `${appUrl}${redirect}`

        const response = NextResponse.redirect(finalRedirect)
        setSessionCookie(response, token)
        return response
    } catch (err: any) {
        console.error('Google OAuth callback error:', err.message)
        return NextResponse.redirect(`${appUrl}/signin?error=GoogleAuthFailed`)
    }
}
