import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/adminAuth'
import { getServiceRoleClient } from '@/lib/supabase'
import { syncBookingToCalendar, deleteBookingFromCalendar } from '@/lib/calendar'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyAdminSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { instructorId, lessonId, date, time, status, paymentStatus, pickupAddress, vehicleType, transmissionType } = await request.json()
    const db = getServiceRoleClient()

    // Fetch existing booking to get hire_id and current duration as fallback
    const { data: existing } = await db
        .from('bookings')
        .select('hire_id, start_time, end_time')
        .eq('id', id)
        .single()

    // Resolve duration: lesson takes priority, then hire option, then preserve existing gap
    let durationMs: number
    if (lessonId) {
        const { data: lesson } = await db.from('lessons').select('duration_minutes').eq('id', lessonId).single()
        if (!lesson) return NextResponse.json({ error: 'Lesson not found.' }, { status: 400 })
        durationMs = lesson.duration_minutes * 60000
    } else if (existing?.hire_id) {
        const { data: hire } = await db.from('vehicle_hires').select('duration_minutes').eq('id', existing.hire_id).single()
        durationMs = (hire?.duration_minutes ?? 60) * 60000
    } else {
        // Preserve original duration
        durationMs = existing
            ? new Date(existing.end_time).getTime() - new Date(existing.start_time).getTime()
            : 60 * 60000
    }

    // Treat date+time as Brisbane local time (AEST = UTC+10, no DST in QLD)
    const startTime = new Date(`${date}T${time}:00+10:00`)
    const endTime = new Date(startTime.getTime() + durationMs)

    // Double-booking check — exclude the booking being edited (lesson bookings only)
    if (status === 'scheduled' && instructorId) {
        const { data: conflicts } = await db
            .from('bookings')
            .select('id, start_time')
            .eq('instructor_id', instructorId)
            .neq('id', id)
            .in('status', ['scheduled'])
            .lt('start_time', endTime.toISOString())
            .gt('end_time', startTime.toISOString())

        if (conflicts && conflicts.length > 0) {
            const clash = new Date(conflicts[0].start_time)
            return NextResponse.json({
                error: `Instructor already has a booking on ${clash.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} at ${clash.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}.`
            }, { status: 409 })
        }
    }

    const { data, error } = await db
        .from('bookings')
        .update({
            instructor_id: instructorId || null,
            lesson_id: lessonId || null,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status,
            payment_status: paymentStatus,
            pickup_address: pickupAddress,
            vehicle_type: vehicleType,
            transmission_type: vehicleType === 'truck' ? null : transmissionType,
        })
        .eq('id', id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Sync updated booking to Google Calendar (non-blocking)
    syncBookingToCalendar(id).catch(() => {})

    return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyAdminSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const db = getServiceRoleClient()

    // Remove calendar event before deleting the row (needs the event ID stored on the booking)
    await deleteBookingFromCalendar(id)

    const { error } = await db.from('bookings').delete().eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return new NextResponse(null, { status: 204 })
}
