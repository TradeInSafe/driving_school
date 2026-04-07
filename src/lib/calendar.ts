import { google } from 'googleapis';
import { getServiceRoleClient } from '@/lib/supabase';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

export async function addGoogleCalendarEvent(bookingDetails: {
    startTime: string;
    endTime: string;
    studentName: string;
    studentEmail: string;
    pickupAddress: string;
    lessonTitle: string;
}) {
    try {
        if (!CLIENT_ID || !CLIENT_SECRET) {
            console.log("Google Calendar credentials not configured. Skipping sync.");
            return;
        }

        const adminClient = getServiceRoleClient();
        
        // Fetch token from settings
        const { data: setting } = await adminClient
            .from('settings')
            .select('value')
            .eq('key', 'google_calendar_refresh_token')
            .single();

        if (!setting || !setting.value) {
            console.log("No Google Calendar token found. Skipping calendar sync.");
            return;
        }

        const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
        oauth2Client.setCredentials({ refresh_token: setting.value });

        // Listen for token refresh events and persist updated tokens
        oauth2Client.on('tokens', async (tokens) => {
            if (tokens.refresh_token) {
                await adminClient
                    .from('settings')
                    .upsert([{ key: 'google_calendar_refresh_token', value: tokens.refresh_token, updated_at: new Date().toISOString() }], { onConflict: 'key' });
                console.log('Google Calendar refresh token updated');
            }
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const event = {
            summary: `Driving Lesson: ${bookingDetails.studentName} - ${bookingDetails.lessonTitle}`,
            location: bookingDetails.pickupAddress,
            description: `Student: ${bookingDetails.studentName}\nEmail: ${bookingDetails.studentEmail}\nLesson: ${bookingDetails.lessonTitle}\nPickup: ${bookingDetails.pickupAddress}`,
            start: {
                dateTime: bookingDetails.startTime,
                timeZone: 'Australia/Brisbane', // Or get from settings
            },
            end: {
                dateTime: bookingDetails.endTime,
                timeZone: 'Australia/Brisbane',
            },
            attendees: [
                { email: bookingDetails.studentEmail },
            ],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 60 },
                ],
            },
        };

        const res = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        });

        console.log('Event created on Google Calendar:', res.data.htmlLink);
        return res.data;
    } catch (err) {
        console.error('Error adding event to Google Calendar:', err);
    }
}
