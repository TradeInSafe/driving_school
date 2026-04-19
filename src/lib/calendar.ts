import { google } from 'googleapis';
import { getServiceRoleClient } from '@/lib/supabase';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '600462356560-24vr5atvegb83oun3n45qp03pons0ftg.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';

// ---------------------------------------------------------------------------
// Build an authenticated Google Calendar client from a refresh token
// ---------------------------------------------------------------------------
function buildCalendarClient(refreshToken: string) {
    const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    auth.setCredentials({ refresh_token: refreshToken });
    return google.calendar({ version: 'v3', auth });
}

async function getSchoolCalendarClient() {
    const db = getServiceRoleClient();
    const { data } = await db
        .from('settings')
        .select('value')
        .eq('key', 'google_calendar_refresh_token')
        .single();
    if (!data?.value) return null;
    return buildCalendarClient(data.value);
}

async function getInstructorCalendarClient(instructorId: string) {
    const db = getServiceRoleClient();
    const { data } = await db
        .from('instructors')
        .select('google_calendar_refresh_token')
        .eq('id', instructorId)
        .single();
    if (!data?.google_calendar_refresh_token) return null;
    return buildCalendarClient(data.google_calendar_refresh_token);
}

// ---------------------------------------------------------------------------
// Event body builder
// ---------------------------------------------------------------------------
interface EventDetails {
    startTime: string;
    endTime: string;
    studentName: string;
    studentEmail?: string | null;
    pickupAddress?: string | null;
    lessonTitle: string;
    instructorName?: string | null;
    isHire?: boolean;
}

function buildEventBody(d: EventDetails) {
    const prefix = d.isHire ? '🚗 Vehicle Hire' : '🚙 Driving Lesson';
    const descLines = [
        `${d.isHire ? 'Hire option' : 'Lesson'}: ${d.lessonTitle}`,
        `Student: ${d.studentName}${d.studentEmail ? ` (${d.studentEmail})` : ''}`,
        d.instructorName ? `Instructor: ${d.instructorName}` : null,
        d.pickupAddress ? `Pickup: ${d.pickupAddress}` : null,
    ].filter(Boolean).join('\n');

    return {
        summary: `${prefix}: ${d.studentName}${d.instructorName ? ` — ${d.instructorName}` : ''}`,
        location: d.pickupAddress || '',
        description: descLines,
        start: { dateTime: d.startTime, timeZone: 'Australia/Brisbane' },
        end: { dateTime: d.endTime, timeZone: 'Australia/Brisbane' },
        attendees: d.studentEmail ? [{ email: d.studentEmail }] : [],
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email' as const, minutes: 24 * 60 },
                { method: 'popup' as const, minutes: 60 },
            ],
        },
    };
}

// ---------------------------------------------------------------------------
// Upsert a single event on one calendar. Returns the resulting event ID.
// Patches if eventId given; re-creates on 404; inserts otherwise.
// ---------------------------------------------------------------------------
async function upsertCalendarEvent(
    calendar: ReturnType<typeof google.calendar>,
    body: object,
    existingEventId: string | null,
    label: string,
): Promise<string | null> {
    if (existingEventId) {
        try {
            await calendar.events.patch({ calendarId: 'primary', eventId: existingEventId, requestBody: body });
            console.log(`[calendar] Updated ${label} event ${existingEventId}`);
            return existingEventId;
        } catch (err: any) {
            if (err.code === 404 || err.status === 404) {
                const res = await calendar.events.insert({ calendarId: 'primary', requestBody: body });
                console.log(`[calendar] Re-created ${label} event ${res.data.id}`);
                return res.data.id || null;
            }
            throw err;
        }
    } else {
        const res = await calendar.events.insert({ calendarId: 'primary', requestBody: body });
        console.log(`[calendar] Created ${label} event ${res.data.id}`);
        return res.data.id || null;
    }
}

// ---------------------------------------------------------------------------
// Main sync — creates/updates the event on the school calendar AND on the
// instructor's personal calendar (if they have connected one).
// ---------------------------------------------------------------------------
export async function syncBookingToCalendar(bookingId: string): Promise<void> {
    try {
        const db = getServiceRoleClient();

        const { data: booking } = await db
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();

        if (!booking) return;

        const [studentRes, instructorRes, lessonRes, hireRes] = await Promise.all([
            db.from('users').select('full_name, email').eq('id', booking.student_id).single(),
            booking.instructor_id
                ? db.from('instructors').select('full_name, email').eq('id', booking.instructor_id).single()
                : Promise.resolve({ data: null }),
            booking.lesson_id
                ? db.from('lessons').select('title').eq('id', booking.lesson_id).single()
                : Promise.resolve({ data: null }),
            booking.hire_id
                ? db.from('vehicle_hires').select('title').eq('id', booking.hire_id).single()
                : Promise.resolve({ data: null }),
        ]);

        const details: EventDetails = {
            startTime: booking.start_time,
            endTime: booking.end_time,
            studentName: studentRes.data?.full_name || 'Student',
            studentEmail: studentRes.data?.email,
            pickupAddress: booking.pickup_address,
            lessonTitle: lessonRes.data?.title || hireRes.data?.title || 'Driving Session',
            instructorName: instructorRes.data?.full_name,
            isHire: !!booking.hire_id,
        };

        const body = buildEventBody(details);

        // Sync to school calendar and instructor calendar in parallel
        const [schoolCalendar, instructorCalendar] = await Promise.all([
            getSchoolCalendarClient(),
            booking.instructor_id ? getInstructorCalendarClient(booking.instructor_id) : Promise.resolve(null),
        ]);

        const [schoolEventId, instructorEventId] = await Promise.all([
            schoolCalendar
                ? upsertCalendarEvent(schoolCalendar, body, booking.google_calendar_event_id ?? null, 'school')
                : Promise.resolve(booking.google_calendar_event_id ?? null),
            instructorCalendar
                ? upsertCalendarEvent(instructorCalendar, body, booking.instructor_calendar_event_id ?? null, `instructor:${booking.instructor_id}`)
                : Promise.resolve(booking.instructor_calendar_event_id ?? null),
        ]);

        // Persist any new event IDs
        const updates: Record<string, string | null> = {};
        if (schoolEventId !== booking.google_calendar_event_id) updates.google_calendar_event_id = schoolEventId;
        if (instructorEventId !== booking.instructor_calendar_event_id) updates.instructor_calendar_event_id = instructorEventId;

        if (Object.keys(updates).length > 0) {
            await db.from('bookings').update(updates).eq('id', bookingId);
        }
    } catch (err) {
        console.error(`[calendar] syncBookingToCalendar failed for booking ${bookingId}:`, err);
    }
}

// ---------------------------------------------------------------------------
// Delete the event from school calendar AND instructor calendar.
// ---------------------------------------------------------------------------
export async function deleteBookingFromCalendar(bookingId: string): Promise<void> {
    try {
        const db = getServiceRoleClient();
        const { data: booking } = await db
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();

        if (!booking) return;

        const deleteFrom = async (
            calendarPromise: Promise<ReturnType<typeof google.calendar> | null>,
            eventId: string | null,
            label: string,
        ) => {
            if (!eventId) return;
            const calendar = await calendarPromise;
            if (!calendar) return;
            try {
                await calendar.events.delete({ calendarId: 'primary', eventId });
                console.log(`[calendar] Deleted ${label} event ${eventId}`);
            } catch (err: any) {
                if (err.code !== 404 && err.status !== 404) {
                    console.error(`[calendar] Failed to delete ${label} event ${eventId}:`, err.message);
                }
            }
        };

        await Promise.all([
            deleteFrom(getSchoolCalendarClient(), booking.google_calendar_event_id, 'school'),
            deleteFrom(
                booking.instructor_id ? getInstructorCalendarClient(booking.instructor_id) : Promise.resolve(null),
                booking.instructor_calendar_event_id,
                `instructor:${booking.instructor_id}`,
            ),
        ]);
    } catch (err) {
        console.error(`[calendar] deleteBookingFromCalendar failed for booking ${bookingId}:`, err);
    }
}

// ---------------------------------------------------------------------------
// Kept for backward-compat with old webhook import.
// ---------------------------------------------------------------------------
export async function addGoogleCalendarEvent(details: {
    startTime: string;
    endTime: string;
    studentName: string;
    studentEmail: string;
    pickupAddress: string;
    lessonTitle: string;
    instructorName?: string;
    isHire?: boolean;
}): Promise<string | null> {
    try {
        const calendar = await getSchoolCalendarClient();
        if (!calendar) return null;
        const res = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: buildEventBody(details),
        });
        return res.data.id || null;
    } catch (err) {
        console.error('[calendar] addGoogleCalendarEvent failed:', err);
        return null;
    }
}
