import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/adminAuth'
import { getServiceRoleClient } from '@/lib/supabase'
import { syncBookingToCalendar } from '@/lib/calendar'

export async function POST(request: NextRequest) {
    if (!verifyAdminSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentId, instructorId, lessonId, hireId, date, time, transmission, vehicleType, pickupAddress, paymentMethod, newStudent } = await request.json()
    // newStudent fields: full_name, email, phone, address, gender, license_number, license_expiry
    const db = getServiceRoleClient()

    // Resolve student — create new user record if needed
    let resolvedStudentId = studentId
    if (newStudent?.full_name) {
        const email = (newStudent.email || `admin-created-${Date.now()}@placeholder.local`).toLowerCase()

        // Check if user already exists by email
        const { data: existing } = await db.from('users').select('id').eq('email', email).maybeSingle()
        if (existing) {
            resolvedStudentId = existing.id
        } else {
            const { data: newUser, error: createErr } = await db
                .from('users')
                .insert({
                    email,
                    full_name: newStudent.full_name,
                    phone: newStudent.phone || null,
                    address: newStudent.address || null,
                    gender: newStudent.gender || null,
                    license_number: newStudent.license_number || null,
                    license_expiry: newStudent.license_expiry || null,
                })
                .select('id')
                .single()
            if (createErr || !newUser) {
                return NextResponse.json({ error: 'Failed to create student: ' + createErr?.message }, { status: 500 })
            }
            resolvedStudentId = newUser.id
        }
    }

    if (!resolvedStudentId) {
        return NextResponse.json({ error: 'No student selected or provided.' }, { status: 400 })
    }

    // ── Vehicle hire booking ──────────────────────────────────────────────────
    if (hireId) {
        const { data: hire } = await db.from('vehicle_hires').select('duration_minutes, vehicle_type').eq('id', hireId).single()
        if (!hire) return NextResponse.json({ error: 'Hire option not found.' }, { status: 400 })

        const BUFFER_MS = 30 * 60_000
        const startTime = new Date(`${date}T${time}:00+10:00`)
        const endTime = new Date(startTime.getTime() + hire.duration_minutes * 60000)

        // Check vehicle isn't already booked within the booking window + 30-min buffer
        const { data: conflicts } = await db
            .from('bookings')
            .select('id, start_time, end_time')
            .eq('hire_id', hireId)
            .in('status', ['scheduled'])
            .lt('start_time', new Date(endTime.getTime() + BUFFER_MS).toISOString())
            .gt('end_time', new Date(startTime.getTime() - BUFFER_MS).toISOString())

        if (conflicts && conflicts.length > 0) {
            const clash = conflicts[0]
            const clashTime = new Date(clash.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Brisbane' })
            const clashDate = new Date(clash.start_time).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Australia/Brisbane' })
            return NextResponse.json(
                { error: `This vehicle is already booked on ${clashDate} at ${clashTime} (including 30-min buffer). Please choose a different time.` },
                { status: 409 }
            )
        }

        const { data: newHireBooking, error: bookingError } = await db.from('bookings').insert({
            student_id: resolvedStudentId,
            hire_id: hireId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'scheduled',
            payment_status: paymentMethod || 'pending',
            pickup_address: pickupAddress || 'Admin booking',
            vehicle_type: hire.vehicle_type,
            needs_instructor: false,
        }).select('id').single()

        if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 })
        // Sync to Google Calendar (non-blocking — failure won't affect the response)
        if (newHireBooking?.id) syncBookingToCalendar(newHireBooking.id).catch(() => {})
        return NextResponse.json({ success: true }, { status: 201 })
    }

    // ── Lesson booking ────────────────────────────────────────────────────────
    const { data: lesson } = await db.from('lessons').select('duration_minutes, price').eq('id', lessonId).single()
    if (!lesson) return NextResponse.json({ error: 'Lesson not found.' }, { status: 400 })

    // Treat date+time as Brisbane local time (AEST = UTC+10, no DST in QLD)
    const startTime = new Date(`${date}T${time}:00+10:00`)
    const endTime = new Date(startTime.getTime() + lesson.duration_minutes * 60000)

    // Double-booking check (including 30-min travel buffer)
    if (instructorId) {
        const LESSON_BUFFER_MS = 30 * 60_000
        const { data: conflicts } = await db
            .from('bookings')
            .select('id, start_time, end_time')
            .eq('instructor_id', instructorId)
            .in('status', ['scheduled'])
            .lt('start_time', new Date(endTime.getTime() + LESSON_BUFFER_MS).toISOString())
            .gt('end_time', new Date(startTime.getTime() - LESSON_BUFFER_MS).toISOString())

        if (conflicts && conflicts.length > 0) {
            const clash = conflicts[0]
            const clashTime = new Date(clash.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
            const clashDate = new Date(clash.start_time).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
            return NextResponse.json(
                { error: `Instructor already has a booking on ${clashDate} at ${clashTime} (including 30-min travel buffer). Please choose a different time.` },
                { status: 409 }
            )
        }
    }

    const { data: newBooking, error: bookingError } = await db.from('bookings').insert({
        student_id: resolvedStudentId,
        instructor_id: instructorId,
        lesson_id: lessonId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
        payment_status: paymentMethod || 'pending',
        pickup_address: pickupAddress || 'Admin booking',
        vehicle_type: vehicleType || 'car',
        transmission_type: vehicleType === 'truck' ? null : (transmission || 'auto'),
    }).select('id').single()

    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 })
    // Sync to Google Calendar (non-blocking — failure won't affect the response)
    if (newBooking?.id) syncBookingToCalendar(newBooking.id).catch(() => {})

    return NextResponse.json({ success: true }, { status: 201 })
}
