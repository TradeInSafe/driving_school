import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServiceRoleClient } from '@/lib/supabase'

function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
        console.warn('STRIPE_SECRET_KEY is not set - payments will be bypassed')
        return null
    }
    return new Stripe(key, { apiVersion: '2026-02-25.clover' })
}

export async function POST(req: Request) {
    try {
        const { lessonId, studentId, instructorId, slots, pickupAddress, vehicleType, transmissionType, paymentMethod } = await req.json()

        if (!lessonId || !studentId || !instructorId || !slots?.length) {
            const missing = [
                !lessonId && 'lessonId',
                !studentId && 'studentId',
                !instructorId && 'instructorId',
                !slots?.length && 'slots',
            ].filter(Boolean).join(', ')
            console.error('Missing booking fields:', missing, { lessonId, studentId, instructorId, slotsLength: slots?.length })
            return NextResponse.json({ error: `Missing required booking fields: ${missing}` }, { status: 400 })
        }

        const db = getServiceRoleClient()

        // Fetch lesson price
        const { data: lesson, error: lessonError } = await db
            .from('lessons')
            .select('price')
            .eq('id', lessonId)
            .single()

        if (lessonError || !lesson) {
            throw new Error('Lesson not found')
        }

        // Server-side double-booking check — run before insert
        for (const slot of slots as { start_time: string; end_time: string }[]) {
            const { data: conflicts } = await db
                .from('bookings')
                .select('id, start_time, end_time')
                .eq('instructor_id', instructorId)
                .in('status', ['scheduled'])
                .lt('start_time', slot.end_time)
                .gt('end_time', slot.start_time)

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

        // Create bookings via service role (bypasses RLS)
        const isInPerson = paymentMethod === 'in-person'
        // Assign a shared bundle_id when booking multiple slots at once
        const bundleId = slots.length > 1
            ? crypto.randomUUID()
            : null
        const pendingBookings = slots.map((slot: { start_time: string; end_time: string }) => ({
            student_id: studentId,
            instructor_id: instructorId,
            lesson_id: lessonId,
            start_time: slot.start_time,
            end_time: slot.end_time,
            status: 'scheduled',
            payment_status: isInPerson ? 'pay_in_person' : 'pending',
            pickup_address: pickupAddress,
            vehicle_type: vehicleType || 'car',
            transmission_type: vehicleType === 'truck' ? null : (transmissionType || 'auto'),
            bundle_id: bundleId,
        }))

        const { data: bookings, error: bookingError } = await db
            .from('bookings')
            .insert(pendingBookings)
            .select()

        if (bookingError) throw new Error(bookingError.message)

        // In-person payment — no Stripe needed
        if (isInPerson) {
            return NextResponse.json({ bypassStripe: true, payInPerson: true })
        }

        const bookingIds = bookings.map((b: any) => b.id).join(',')

        const stripe = getStripe()
        if (!stripe) {
            console.warn('Stripe keys missing - Bypassing payment for local testing')

            const { error: updateError } = await db
                .from('bookings')
                .update({ payment_status: 'paid', status: 'scheduled' })
                .in('id', bookings.map((b: any) => b.id))

            if (updateError) throw new Error(updateError.message)

            return NextResponse.json({ bypassStripe: true })
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(lesson.price * 100),
            currency: 'aud',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                bookingIds,
            },
        })

        return NextResponse.json({ clientSecret: paymentIntent.client_secret })
    } catch (err: any) {
        console.error('Stripe error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
