import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const redirect = searchParams.get('redirect') || '/dashboard'

    const state = Buffer.from(JSON.stringify({
        redirect,
        nonce: crypto.randomBytes(16).toString('hex'),
    })).toString('base64url')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!)
    googleAuthUrl.searchParams.set('redirect_uri', `${appUrl}/api/auth/google/callback`)
    googleAuthUrl.searchParams.set('response_type', 'code')
    googleAuthUrl.searchParams.set('scope', 'openid email profile')
    googleAuthUrl.searchParams.set('state', state)
    googleAuthUrl.searchParams.set('access_type', 'online')

    return NextResponse.redirect(googleAuthUrl.toString())
}
