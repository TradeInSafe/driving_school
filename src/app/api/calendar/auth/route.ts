import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '600462356560-24vr5atvegb83oun3n45qp03pons0ftg.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${url.protocol}//${url.host}/api/calendar/callback`;

    // Optional instructorId — when present the token will be stored on the
    // instructor row rather than in the shared settings table.
    const instructorId = url.searchParams.get('instructorId') || '';

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/calendar.readonly',
        ],
        // Carry instructorId through the OAuth round-trip via the state param
        state: instructorId ? `instructor:${instructorId}` : 'school',
    });

    return NextResponse.redirect(authUrl);
}
