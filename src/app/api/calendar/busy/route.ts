import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServiceRoleClient } from '@/lib/supabase';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const instructorId = url.searchParams.get('instructorId');
        const currentStudentId = url.searchParams.get('studentId') || '';

        if (!instructorId) {
            return NextResponse.json({ error: 'instructorId required' }, { status: 400 });
        }

        const adminClient = getServiceRoleClient();

        // Fetch configurable buffer from settings (default 30 mins)
        const { data: bufferSetting } = await adminClient
            .from('settings')
            .select('value')
            .eq('key', 'instructor_buffer_mins')
            .single();
        const bufferMins = parseInt(bufferSetting?.value || '30', 10);

        // 1. Fetch Supabase Bookings (include student_id for buffer logic)
        const { data: bookingsData } = await adminClient
            .from('bookings')
            .select('start_time, end_time, student_id')
            .eq('instructor_id', instructorId)
            .in('status', ['scheduled', 'completed']);

        let busySlots = (bookingsData || []).flatMap((b: any) => {
            const isSameStudent = b.student_id === currentStudentId;
            const slots: any[] = [{
                start: b.start_time,
                end: b.end_time,
                display: 'background',
                backgroundColor: '#fee2e2',
                className: 'busy-slot',
                extendedProps: { studentId: b.student_id, isBuffer: false },
            }];
            // Add visual buffer block for different-user bookings
            if (!isSameStudent && bufferMins > 0) {
                const bufferStart = b.end_time;
                const bufferEnd = new Date(new Date(b.end_time).getTime() + bufferMins * 60 * 1000).toISOString();
                slots.push({
                    start: bufferStart,
                    end: bufferEnd,
                    title: `Travel Buffer (${bufferMins}m)`,
                    display: 'block',
                    backgroundColor: '#f97316',
                    borderColor: '#ea580c',
                    textColor: '#fff',
                    className: 'buffer-slot',
                    editable: false,
                    extendedProps: { studentId: b.student_id, isBuffer: true },
                });
            }
            return slots;
        });

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

        return NextResponse.json({ busySlots, bufferMins });
    } catch (err: any) {
        console.error('Calendar Fetch Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
