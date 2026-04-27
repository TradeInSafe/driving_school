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

    // Fetch existing booking to determine type (hire vs lesson) and fallback duration
    const { data: existing } = await db
        .from('bookings')
        .select('hire_id, start_time, end_time')
        .eq('id', id)
        .single()

    const isHire = !!existing?.hire_id

    // Resolve duration based on booking type
    let durationMs: number
    if (isHire) {
        // Hire booking — duration comes from the hire option, not the lesson
        const { data: hire } = await db
            .from('vehicle_hires')
            .select('duration_minutes')
            .eq('id', existing.hire_id)
            .single()
        durationMs = (hire?.duration_minutes ?? 60) * 60000
    } else {
        // Lesson booking — use the selected lesson's duration
        if (!lessonId) {
            return NextResponse.json({ error: 'Lesson is required.' }, { status: 400 })
        }
        const { data: lesson } = await db
            .from('lessons')
            .select('duration_minutes')
            .eq('id', lessonId)
            .single()
        if (!lesson) return NextResponse.json({ error: 'Lesson not found.' }, { status: 400 })
        durationMs = lesson.duration_minutes * 60000
    }

    // Treat date+time as Brisbane local time (AEST = UTC+10, no DST in QLD)
    const startTime = new Date(`${date}T${time}:00+10:00`)
    const endTime = new Date(startTime.getTime() + durationMs)

    // Double-booking check for hire bookings — same vehicle, overlapping time + 30-min buffer
    const BUFFER_MS = 30 * 60_000
    if (isHire && status === 'scheduled') {
        const { data: conflicts } = await db
            .from('bookings')
            .select('id, start_time')
            .eq('hire_id', existing.hire_id)
            .neq('id', id)
            .in('status', ['scheduled'])
            .lt('start_time', new Date(endTime.getTime() + BUFFER_MS).toISOString())
            .gt('end_time', new Date(startTime.getTime() - BUFFER_MS).toISOString())

        if (conflicts && conflicts.length > 0) {
            const clash = new Date(conflicts[0].start_time)
            return NextResponse.json({
                error: `This vehicle is already booked on ${clash.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Australia/Brisbane' })} at ${clash.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Brisbane' })} (including 30-min buffer). Please choose a different time.`
            }, { status: 409 })
        }
    }

    // Double-booking check for lesson bookings with an instructor (including 30-min travel buffer)
    if (!isHire && status === 'scheduled' && instructorId) {
        const { data: conflicts } = await db
            .from('bookings')
            .select('id, start_time')
            .eq('instructor_id', instructorId)
            .neq('id', id)
            .in('status', ['scheduled'])
            .lt('start_time', new Date(endTime.getTime() + BUFFER_MS).toISOString())
            .gt('end_time', new Date(startTime.getTime() - BUFFER_MS).toISOString())

        if (conflicts && conflicts.length > 0) {
            const clash = new Date(conflicts[0].start_time)
            return NextResponse.json({
                error: `Instructor already has a booking on ${clash.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} at ${clash.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} (including 30-min travel buffer).`
            }, { status: 409 })
        }
    }

    const updatePayload: Record<string, any> = {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status,
        payment_status: paymentStatus,
        pickup_address: pickupAddress,
        vehicle_type: vehicleType,
    }

    if (isHire) {
        // Hire bookings never have a lesson or instructor; don't overwrite those fields
        updatePayload.transmission_type = null
    } else {
        updatePayload.instructor_id = instructorId || null
        updatePayload.lesson_id = lessonId || null
        updatePayload.transmission_type = vehicleType === 'truck' ? null : transmissionType
    }

    const { data, error } = await db
        .from('bookings')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    syncBookingToCalendar(id).catch(() => {})

    return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyAdminSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const db = getServiceRoleClient()

    await deleteBookingFromCalendar(id)

    const { error } = await db.from('bookings').delete().eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return new NextResponse(null, { status: 204 })
}
