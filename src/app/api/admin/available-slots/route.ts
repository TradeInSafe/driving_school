import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/adminAuth'
import { getServiceRoleClient } from '@/lib/supabase'

// Returns available start times for an instructor on a specific date,
// given a lesson duration, excluding already-booked slots (+ travel buffer).
export async function GET(request: NextRequest) {
    if (!verifyAdminSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const instructorId = searchParams.get('instructorId')
    const date = searchParams.get('date')           // YYYY-MM-DD
    const durationMins = parseInt(searchParams.get('durationMins') || '60')
    const excludeBookingId = searchParams.get('excludeBookingId') || ''

    if (!instructorId || !date) {
        return NextResponse.json({ error: 'instructorId and date are required' }, { status: 400 })
    }

    const db = getServiceRoleClient()

    // Day of week for the selected date — anchor to Brisbane midnight (AEST = UTC+10, no DST in QLD)
    const selectedDate = new Date(`${date}T00:00:00+10:00`)
    const dayOfWeek = selectedDate.getDay()

    // Helper: fetch availability rows by type for a specific date, with day_of_week fallback
    const fetchWindows = async (type: string) => {
        const { data: specific } = await db
            .from('availability')
            .select('start_time, end_time')
            .eq('instructor_id', instructorId)
            .eq('specific_date', date)
            .eq('type', type)
            .eq('is_active', true)
        if (specific && specific.length > 0) return specific

        const { data: recurring } = await db
            .from('availability')
            .select('start_time, end_time')
            .eq('instructor_id', instructorId)
            .eq('day_of_week', dayOfWeek)
            .is('specific_date', null)
            .eq('type', type)
            .eq('is_active', true)
        return recurring || []
    }

    // 1. Fetch available windows
    const windows = await fetchWindows('available')
    if (windows.length === 0) {
        return NextResponse.json({ slots: [], message: 'Instructor is not available on this day.' })
    }

    // 1b. Fetch blocked periods (not-available overrides within the available window)
    const blockedPeriods = await fetchWindows('blocked')

    // 2. Fetch buffer setting
    const { data: bufferSetting } = await db
        .from('settings')
        .select('value')
        .eq('key', 'instructor_buffer_mins')
        .single()
    const bufferMins = parseInt(bufferSetting?.value || '30', 10)

    // 3. Fetch existing bookings on this date (excluding the booking being edited)
    // Use Brisbane timezone boundaries so we don't miss early-morning slots stored as previous UTC day
    const dayStart = new Date(`${date}T00:00:00+10:00`).toISOString()
    const dayEnd = new Date(`${date}T23:59:59+10:00`).toISOString()
    let query = db
        .from('bookings')
        .select('id, start_time, end_time')
        .eq('instructor_id', instructorId)
        .in('status', ['scheduled', 'completed'])
        .gte('start_time', dayStart)
        .lte('start_time', dayEnd)

    const { data: existingBookings } = await query

    const bufferMs = bufferMins * 60 * 1000
    const bookedSlots = (existingBookings || [])
        .filter(b => b.id !== excludeBookingId)
        .map(b => ({
            // Expand each booking by buffer on both sides
            start: new Date(b.start_time).getTime() - bufferMs,
            end: new Date(b.end_time).getTime() + bufferMs,
        }))

    // Convert blocked periods to ms ranges (no buffer needed — exact boundaries)
    const toMs = (hhmm: string) => {
        const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
        return selectedDate.getTime() + (h * 60 + m) * 60 * 1000
    }
    const blockedRanges = blockedPeriods.map(b => ({
        start: toMs(b.start_time),
        end: toMs(b.end_time),
    }))

    // 4. Generate candidate slots every 30 mins within each availability window
    const available: { label: string; value: string }[] = []

    for (const window of windows) {
        // Parse HH:MM into minutes-since-midnight
        const [startH, startM] = window.start_time.slice(0, 5).split(':').map(Number)
        const [endH, endM] = window.end_time.slice(0, 5).split(':').map(Number)
        const windowStartMins = startH * 60 + startM
        const windowEndMins = endH * 60 + endM

        for (let mins = windowStartMins; mins + durationMins <= windowEndMins; mins += 30) {
            const slotStartMs = selectedDate.getTime() + mins * 60 * 1000
            const slotEndMs = slotStartMs + durationMins * 60 * 1000

            // Check against existing bookings (with buffer) and admin-defined blocked periods
            const hasConflict = bookedSlots.some(b => slotStartMs < b.end && slotEndMs > b.start)
                || blockedRanges.some(b => slotStartMs < b.end && slotEndMs > b.start)
            if (hasConflict) continue

            const hh = String(Math.floor(mins / 60)).padStart(2, '0')
            const mm = String(mins % 60).padStart(2, '0')
            const endMins = mins + durationMins
            const ehh = String(Math.floor(endMins / 60)).padStart(2, '0')
            const emm = String(endMins % 60).padStart(2, '0')

            available.push({
                value: `${hh}:${mm}`,
                label: `${hh}:${mm} – ${ehh}:${emm}`,
            })
        }
    }

    return NextResponse.json({ slots: available })
}
