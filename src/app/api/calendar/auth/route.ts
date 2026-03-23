import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '600462356560-24vr5atvegb83oun3n45qp03pons0ftg.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';

export async function GET(req: Request) {
    // Generate auth URL
    // We assume the redirect URI is http://localhost:3000/api/calendar/callback or the host of the request
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
