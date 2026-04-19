import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServiceRoleClient } from '@/lib/supabase';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '600462356560-24vr5atvegb83oun3n45qp03pons0ftg.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${url.protocol}//${url.host}/api/calendar/callback`;

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
    );

    const state = url.searchParams.get('state') || 'school';

    try {
        const { tokens } = await oauth2Client.getToken(code);
        const db = getServiceRoleClient();

        if (tokens.refresh_token) {
            if (state.startsWith('instructor:')) {
                // Save token on the instructor row
                const instructorId = state.replace('instructor:', '')
                const { error } = await db
                    .from('instructors')
                    .update({ google_calendar_refresh_token: tokens.refresh_token })
                    .eq('id', instructorId)
                if (error) {
                    console.error('[calendar/callback] Failed to save instructor token:', error.message)
                    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 })
                }
                console.log(`[calendar/callback] Saved Google Calendar token for instructor ${instructorId}`)
            } else {
                // Save school-level token in settings
                const { error } = await db
                    .from('settings')
                    .upsert([{ key: 'google_calendar_refresh_token', value: tokens.refresh_token, updated_at: new Date().toISOString() }], { onConflict: 'key' })
                if (error) {
                    console.error('[calendar/callback] Failed to save school token:', error.message)
                    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 })
                }
                console.log('[calendar/callback] Saved Google Calendar token for school')
            }
        } else {
            console.warn('[calendar/callback] No refresh token returned — user may need to revoke app access and reconnect.')
        }

        return NextResponse.redirect(new URL('/admin', req.url));
    } catch (err: any) {
        console.error('[calendar/callback] OAuth error:', err);
        return NextResponse.json({ error: 'Failed to authenticate with Google' }, { status: 500 });
    }
}
