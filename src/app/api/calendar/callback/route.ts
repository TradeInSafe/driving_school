import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServiceRoleClient } from '@/lib/supabase';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const REDIRECT_URI = `${url.protocol}//${url.host}/api/calendar/callback`;

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
    );

    try {
        const { tokens } = await oauth2Client.getToken(code);
        
        if (tokens.refresh_token) {
            const adminClient = getServiceRoleClient();
            
            // Upsert the refresh token in the settings table
            const { error: upsertError } = await adminClient
                .from('settings')
                .upsert([
                    { key: 'google_calendar_refresh_token', value: tokens.refresh_token, updated_at: new Date().toISOString() }
                ], { onConflict: 'key' });

            if (upsertError) {
                console.error("Failed to save tokens:", upsertError.message);
                return NextResponse.json({ error: 'Failed to save tokens to database' }, { status: 500 });
            }
        } else {
            console.warn("No refresh token returned. User might need to disconnect the app from their Google Account and try again.");
            // We can still save the access token for temporary usage if we want, but refresh_token is needed for long term.
        }

        // Redirect back to admin dashboard
        return NextResponse.redirect(new URL('/admin', req.url));
    } catch (err: any) {
        console.error('Google Auth Error:', err);
        return NextResponse.json({ error: 'Failed to authenticate with Google' }, { status: 500 });
    }
}
