import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase'
import { sendBookingConfirmationEmail } from '@/lib/email'
import { addGoogleCalendarEvent } from '@/lib/calendar'

export async function POST(req: Request) {
    try {
        const { studentId, instructorId, lessonId, startTime, endTime, pickupAddress, transmissionType } = await req.json()

        if (!studentId || !instructorId || !lessonId || !startTime) {
            return NextResponse.json({ error: 'Missing required booking details' }, { status: 400 })
        }

        const adminClient = getServiceRoleClient()

        // 1. Fetch Student Profile for Credits and Expiry
        const { data: profile, error: profileError } = await adminClient
            .from('profiles')
            .select('credits_remaining, package_expiry, full_name, role')
            .eq('id', studentId)
            .single()

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
        }

        if (profile.credits_remaining <= 0) {
            return NextResponse.json({ error: 'No credits remaining. Please purchase a package.' }, { status: 403 })
        }

        if (profile.package_expiry && new Date() > new Date(profile.package_expiry)) {
            return NextResponse.json({ error: 'Your lesson package has expired.' }, { status: 403 })
        }

        // 2. Sequential Booking Validation
        // Fetch the latest booking for this student
        const { data: lastBooking } = await adminClient
            .from('bookings')
            .select('start_time')
            .eq('student_id', studentId)
            .order('start_time', { ascending: false })
            .limit(1)
            .single()

        if (lastBooking && new Date(startTime) < new Date(lastBooking.start_time)) {
            return NextResponse.json({
                error: `Sequential booking required. Please select a date after your last booking (${new Date(lastBooking.start_time).toLocaleDateString()}).`
            }, { status: 400 })
        }

        // 3. Trainer Availability Check
        const { data: existingBooking } = await adminClient
            .from('bookings')
            .select('id')
            .eq('instructor_id', instructorId)
            .lt('start_time', endTime)
            .gt('end_time', startTime)
            .in('status', ['scheduled', 'completed'])
            .single()

        if (existingBooking) {
            return NextResponse.json({ error: 'Trainer is already booked for this slot.' }, { status: 409 })
        }

        // 4. Atomically Deduct Credit and Create Booking
        // Note: Using a transaction or simple sequential updates since we are using service role
        const { error: deductError } = await adminClient
            .from('profiles')
            .update({ credits_remaining: profile.credits_remaining - 1 })
            .eq('id', studentId)

        if (deductError) throw deductError

        const { error: bookingError } = await adminClient
            .from('bookings')
            .insert({
                student_id: studentId,
                instructor_id: instructorId,
                lesson_id: lessonId,
                start_time: startTime,
                end_time: endTime,
                status: 'scheduled',
                payment_status: 'paid', // Pre-paid via credits
                pickup_address: pickupAddress,
                transmission_type: transmissionType,
                credits_used: 1
            })

        if (bookingError) {
            // Rollback credit if booking fails
            await adminClient
                .from('profiles')
                .update({ credits_remaining: profile.credits_remaining })
                .eq('id', studentId)
            throw bookingError
        }

        // 5. Send Centralized Email Notification
        try {
            // Get Student & Instructor details for email
            const [{ data: { user: studentAuth } }, { data: instructorProfile }, { data: lesson }] = await Promise.all([
                adminClient.auth.admin.getUserById(studentId),
                adminClient.from('profiles').select('full_name, email').eq('id', instructorId).single(),
                adminClient.from('lessons').select('title').eq('id', lessonId).single()
            ])

            if (studentAuth?.email) {
                await sendBookingConfirmationEmail({
                    studentEmail: studentAuth.email,
                    studentName: profile.full_name || 'Student',
                    instructorEmail: instructorProfile?.email,
                    instructorName: instructorProfile?.full_name,
                    lessonTitle: lesson?.title || 'Driving Lesson',
                    startTime,
                    pickupAddress,
                    transmissionType,
                    creditsRemaining: profile.credits_remaining - 1
                })

                // Google Calendar Sync
                await addGoogleCalendarEvent({
                    startTime,
                    endTime,
                    studentName: profile.full_name || 'Student',
                    studentEmail: studentAuth.email,
                    pickupAddress,
                    lessonTitle: lesson?.title || 'Driving Lesson'
                })
            }
        } catch (emailErr) {
            console.error('Failed to send confirmation email:', emailErr)
        }

        return NextResponse.json({ success: true })

    } catch (err: any) {
        console.error('Credit Booking Error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
