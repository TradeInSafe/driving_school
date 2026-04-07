import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

export async function GET(req: Request) {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        return NextResponse.json({ error: 'Google Calendar credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' }, { status: 500 });
    }

    // Generate auth URL
    const url = new URL(req.url);
    const REDIRECT_URI = `${url.protocol}//${url.host}/api/calendar/callback`;

    const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // getting refresh_token
        prompt: 'consent', // force prompt to ensure refresh token is provided
        scope: [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/calendar.readonly'
        ],
    });

    return NextResponse.redirect(authUrl);
}
