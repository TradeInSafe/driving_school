import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase'
import { sendBookingConfirmationEmail } from '@/lib/email'
import { addGoogleCalendarEvent } from '@/lib/calendar'

export async function POST(req: Request) {
    try {
        const { studentId, instructorId, lessonId, slots, pickupAddress, transmissionType } = await req.json()

        // slots: [{ start_time: string, end_time: string }]
        if (!studentId || !instructorId || !lessonId || !slots?.length) {
            return NextResponse.json({ error: 'Missing required booking details' }, { status: 400 })
        }

        const numSlots = slots.length
        const adminClient = getServiceRoleClient()

        // 1. Fetch Student Profile for Credits and Expiry
        const { data: profile, error: profileError } = await adminClient
            .from('users')
            .select('credits_remaining, package_expiry, full_name, email')
            .eq('id', studentId)
            .single()

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
        }

        if (profile.credits_remaining < numSlots) {
            return NextResponse.json({
                error: `Not enough credits. You have ${profile.credits_remaining} but need ${numSlots}.`
            }, { status: 403 })
        }

        if (profile.package_expiry && new Date() > new Date(profile.package_expiry)) {
            return NextResponse.json({ error: 'Your lesson package has expired.' }, { status: 403 })
        }

        // 2. Conflict check for every slot (including 30-min travel buffer)
        const BUFFER_MS = 30 * 60_000
        for (const slot of slots as { start_time: string; end_time: string }[]) {
            const slotEnd = new Date(slot.end_time).getTime()
            const slotStart = new Date(slot.start_time).getTime()
            const { data: existingBooking } = await adminClient
                .from('bookings')
                .select('id')
                .eq('instructor_id', instructorId)
                .lt('start_time', new Date(slotEnd + BUFFER_MS).toISOString())
                .gt('end_time', new Date(slotStart - BUFFER_MS).toISOString())
                .in('status', ['scheduled', 'completed'])
                .single()

            if (existingBooking) {
                return NextResponse.json({
                    error: `Trainer is already booked for the slot on ${new Date(slot.start_time).toLocaleDateString()}.`
                }, { status: 409 })
            }
        }

        // 3. Deduct all credits upfront
        const { error: deductError } = await adminClient
            .from('users')
            .update({ credits_remaining: profile.credits_remaining - numSlots })
            .eq('id', studentId)

        if (deductError) throw deductError

        // 4. Create all bookings
        const bundleId = slots.length > 1 ? crypto.randomUUID() : null
        const bookingsToInsert = (slots as { start_time: string; end_time: string }[]).map(slot => ({
            student_id: studentId,
            instructor_id: instructorId,
            lesson_id: lessonId,
            start_time: slot.start_time,
            end_time: slot.end_time,
            status: 'scheduled',
            payment_status: 'paid',
            pickup_address: pickupAddress,
            transmission_type: transmissionType,
            credits_used: 1,
            bundle_id: bundleId,
        }))

        const { error: bookingError } = await adminClient
            .from('bookings')
            .insert(bookingsToInsert)

        if (bookingError) {
            // Rollback credits on booking failure
            await adminClient
                .from('users')
                .update({ credits_remaining: profile.credits_remaining })
                .eq('id', studentId)
            throw bookingError
        }

        // 5. Send confirmation email + Google Calendar events
        try {
            const [{ data: instructorProfile }, { data: lesson }] = await Promise.all([
                adminClient.from('instructors').select('full_name, email').eq('id', instructorId).single(),
                adminClient.from('lessons').select('title').eq('id', lessonId).single()
            ])

            if (profile.email) {
                const lessonTitle = (lesson?.title || 'Driving Lesson') +
                    (numSlots > 1 ? ` (1 of ${numSlots} sessions)` : '')

                await sendBookingConfirmationEmail({
                    studentEmail: profile.email,
                    studentName: profile.full_name || 'Student',
                    instructorEmail: instructorProfile?.email,
                    instructorName: instructorProfile?.full_name,
                    lessonTitle,
                    startTime: slots[0].start_time,
                    pickupAddress,
                    transmissionType,
                })

                for (const slot of slots as { start_time: string; end_time: string }[]) {
                    await addGoogleCalendarEvent({
                        startTime: slot.start_time,
                        endTime: slot.end_time,
                        studentName: profile.full_name || 'Student',
                        studentEmail: profile.email,
                        pickupAddress,
                        lessonTitle: lesson?.title || 'Driving Lesson'
                    })
                }
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
