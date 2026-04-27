import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServiceRoleClient } from '@/lib/supabase'
import { sendBookingConfirmationEmail } from '@/lib/email'

const stripeBase = process.env.STRIPE_SECRET_KEY as string
const stripe = stripeBase ? new Stripe(stripeBase, {
    apiVersion: '2026-02-25.clover',
}) : null

export async function POST(req: Request) {
    try {
        const { lessonId, hireId, studentId, instructorId, needsInstructor, slots, pickupAddress } = await req.json()

        if ((!lessonId && !hireId) || !studentId || !slots?.length) {
            return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 })
        }

        const db = getServiceRoleClient()

        // Fetch price from lesson or hire
        let price: number
        if (hireId) {
            const { data: hire, error } = await db.from('vehicle_hires').select('price').eq('id', hireId).single()
            if (error || !hire) throw new Error('Vehicle hire option not found')
            price = hire.price
        } else {
            const { data: lesson, error } = await db.from('lessons').select('price').eq('id', lessonId).single()
            if (error || !lesson) throw new Error('Lesson not found')
            price = lesson.price
        }

        // Double-booking check when instructor is assigned (including 30-min travel buffer)
        const BUFFER_MS = 30 * 60_000
        if (instructorId) {
            for (const slot of slots as { start_time: string; end_time: string }[]) {
                const slotEnd = new Date(slot.end_time).getTime()
                const slotStart = new Date(slot.start_time).getTime()
                const { data: conflicts } = await db
                    .from('bookings')
                    .select('id, start_time, end_time')
                    .eq('instructor_id', instructorId)
                    .in('status', ['scheduled'])
                    .lt('start_time', new Date(slotEnd + BUFFER_MS).toISOString())
                    .gt('end_time', new Date(slotStart - BUFFER_MS).toISOString())

                if (conflicts && conflicts.length > 0) {
                    const clash = conflicts[0]
                    const clashStart = new Date(clash.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
                    const clashDate = new Date(clash.start_time).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                    return NextResponse.json(
                        { error: `This slot overlaps with an existing booking on ${clashDate} at ${clashStart}. Please choose a different time.` },
                        { status: 409 }
                    )
                }
            }
        }

        // Double-booking check for hire vehicle (no instructor)
        if (hireId && !instructorId) {
            for (const slot of slots as { start_time: string; end_time: string }[]) {
                const { data: conflicts } = await db
                    .from('bookings')
                    .select('id, start_time, end_time')
                    .eq('hire_id', hireId)
                    .in('status', ['scheduled'])
                    .lt('start_time', slot.end_time)
                    .gt('end_time', slot.start_time)

                if (conflicts && conflicts.length > 0) {
                    const clash = conflicts[0]
                    const clashStart = new Date(clash.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
                    const clashDate = new Date(clash.start_time).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                    return NextResponse.json(
                        { error: `This vehicle is already booked on ${clashDate} at ${clashStart}. Please choose a different time.` },
                        { status: 409 }
                    )
                }
            }
        }

        const bundleId = slots.length > 1 ? crypto.randomUUID() : null
        const pendingBookings = slots.map((slot: { start_time: string; end_time: string }) => ({
            student_id: studentId,
            instructor_id: instructorId || null,
            lesson_id: lessonId || null,
            hire_id: hireId || null,
            needs_instructor: hireId ? (needsInstructor ?? false) : false,
            start_time: slot.start_time,
            end_time: slot.end_time,
            status: 'scheduled',
            payment_status: 'pending',
            pickup_address: pickupAddress,
            bundle_id: bundleId,
        }))

        const { data: bookings, error: bookingError } = await db
            .from('bookings')
            .insert(pendingBookings)
            .select()

        if (bookingError) throw new Error(bookingError.message)

        const bookingIds = bookings.map((b: any) => b.id).join(',')

        if (!stripe) {
            await db
                .from('bookings')
                .update({ payment_status: 'paid' })
                .in('id', bookings.map((b: any) => b.id))

            // Send confirmation email on bypass path (no Stripe)
            try {
                const [studentResult, instructorResult, lessonResult, hireResult] = await Promise.all([
                    db.from('users').select('full_name, email').eq('id', studentId).single(),
                    instructorId ? db.from('instructors').select('full_name, email').eq('id', instructorId).single() : Promise.resolve({ data: null }),
                    lessonId ? db.from('lessons').select('title').eq('id', lessonId).single() : Promise.resolve({ data: null }),
                    hireId ? db.from('vehicle_hires').select('title').eq('id', hireId).single() : Promise.resolve({ data: null }),
                ])
                const student = studentResult.data
                const instructor = instructorResult.data
                const bookingTitle = lessonResult.data?.title || hireResult.data?.title || 'Driving Lesson'
                if (student?.email) {
                    await sendBookingConfirmationEmail({
                        studentEmail: student.email,
                        studentName: student.full_name || 'Student',
                        instructorEmail: instructor?.email,
                        instructorName: instructor?.full_name,
                        lessonTitle: bookingTitle + (bookings.length > 1 ? ` (1 of ${bookings.length})` : ''),
                        startTime: bookings[0].start_time,
                        pickupAddress: pickupAddress,
                        transmissionType: '',
                    })
                }
            } catch (emailErr: any) {
                console.error('Failed to send bypass booking email:', emailErr.message)
            }

            return NextResponse.json({ bypassStripe: true })
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(price * 100),
            currency: 'aud',
            automatic_payment_methods: { enabled: true },
            metadata: { bookingIds },
        })

        return NextResponse.json({ clientSecret: paymentIntent.client_secret, bookingIds })
    } catch (err: any) {
        console.error('Payment intent error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
