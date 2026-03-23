import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServiceRoleClient } from '@/lib/supabase';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '600462356560-24vr5atvegb83oun3n45qp03pons0ftg.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const instructorId = url.searchParams.get('instructorId');

        if (!instructorId) {
            return NextResponse.json({ error: 'instructorId required' }, { status: 400 });
        }

        const adminClient = getServiceRoleClient();

        // 1. Fetch Supabase Bookings
        const { data: bookingsData } = await adminClient
            .from('bookings')
            .select('start_time, end_time')
            .eq('instructor_id', instructorId)
            .in('status', ['scheduled', 'completed']);

        let busySlots = (bookingsData || []).map((b: any) => ({
            start: b.start_time,
            end: b.end_time,
            display: 'background',
            backgroundColor: '#fee2e2',
            className: 'busy-slot'
        }));

        // 2. Fetch Google Calendar Token
        const { data: setting } = await adminClient
            .from('settings')
            .select('value')
            .eq('key', 'google_calendar_refresh_token')
            .single();

        if (setting && setting.value) {
            const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
            oauth2Client.setCredentials({ refresh_token: setting.value });

            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            
            // Get events for the next 60 days
            const timeMin = new Date().toISOString();
            const timeMaxDate = new Date();
            timeMaxDate.setDate(timeMaxDate.getDate() + 60);
            const timeMax = timeMaxDate.toISOString();

            try {
                const res = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin,
                    timeMax,
                    singleEvents: true,
                    orderBy: 'startTime',
                });

                const gcalEvents = res.data.items || [];
                
                const gcalBusy = gcalEvents.map(event => {
                    const start = event.start?.dateTime || event.start?.date;
                    const end = event.end?.dateTime || event.end?.date;
                    
                    if (!start || !end) return null;

                    return {
                        start,
                        end,
                        display: 'background',
                        backgroundColor: '#e0e7ff', // Different color for GCal
                        className: 'gcal-busy-slot',
                        title: 'Google Event'
                    };
                }).filter((e): e is NonNullable<typeof e> => e !== null);

                busySlots = [...busySlots, ...gcalBusy];
            } catch (calErr) {
                console.error("Failed to fetch Google Calendar events:", calErr);
            }
        }

        return NextResponse.json({ busySlots });
    } catch (err: any) {
        console.error('Calendar Fetch Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
