import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase, getServiceRoleClient } from '@/lib/supabase'
import { sendBookingConfirmationEmail } from '@/lib/email'
import { addGoogleCalendarEvent } from '@/lib/calendar'

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string

function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    return new Stripe(key, { apiVersion: '2026-02-25.clover' })
}

export async function POST(req: Request) {
    const body = await req.text()
    const sig = (await headers()).get('stripe-signature') as string

    let event: Stripe.Event

    try {
        event = getStripe().webhooks.constructEvent(body, sig, endpointSecret)
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`)
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object as Stripe.PaymentIntent
            const { bookingId, bookingIds } = paymentIntent.metadata

            const adminClient = getServiceRoleClient()

            if (bookingIds || bookingId) {
                // Update booking status for individual lessons (or multiple if package booked at once)
                const idsArray = bookingIds ? bookingIds.split(',') : [bookingId];
                
                const { data: bookings, error } = await adminClient
                    .from('bookings')
                    .update({ payment_status: 'paid' })
                    .in('id', idsArray)
                    .select(`
                        id, start_time, end_time, pickup_address, student_id, instructor_id, lesson_id, hire_id,
                        student:users!bookings_student_id_fkey(full_name, email)
                    `)

                if (error) {
                    console.error('Error updating booking status:', error.message)
                } else if (bookings && bookings.length > 0) {
                    const firstBooking = bookings[0];
                    try {
                        // Fetch instructor and lesson/hire in parallel (both may be null for hire-only bookings)
                        const [instructorResult, lessonResult, hireResult] = await Promise.all([
                            firstBooking.instructor_id
                                ? adminClient.from('instructors').select('full_name, email').eq('id', firstBooking.instructor_id).single()
                                : Promise.resolve({ data: null }),
                            firstBooking.lesson_id
                                ? adminClient.from('lessons').select('title').eq('id', firstBooking.lesson_id).single()
                                : Promise.resolve({ data: null }),
                            (firstBooking as any).hire_id
                                ? adminClient.from('vehicle_hires').select('title').eq('id', (firstBooking as any).hire_id).single()
                                : Promise.resolve({ data: null }),
                        ])

                        const instructorProfile = instructorResult.data
                        const lesson = lessonResult.data
                        const hire = hireResult.data
                        const bookingTitle = lesson?.title || hire?.title || 'Driving Lesson'

                        const studentData = Array.isArray(firstBooking.student)
                            ? firstBooking.student[0]
                            : (firstBooking.student as any)
                        const studentEmail = studentData?.email
                        const studentName = studentData?.full_name || 'Student'

                        if (studentEmail) {
                            await sendBookingConfirmationEmail({
                                studentEmail,
                                studentName,
                                instructorEmail: instructorProfile?.email,
                                instructorName: instructorProfile?.full_name,
                                lessonTitle: bookingTitle + (bookings.length > 1 ? ` (1 of ${bookings.length})` : ''),
                                startTime: firstBooking.start_time,
                                pickupAddress: firstBooking.pickup_address,
                                transmissionType: '',
                            })

                            // Bulk Google Calendar Sync
                            for (const b of bookings) {
                                await addGoogleCalendarEvent({
                                    startTime: b.start_time,
                                    endTime: b.end_time || (new Date(new Date(b.start_time).getTime() + 60 * 60 * 1000).toISOString()),
                                    studentName,
                                    studentEmail,
                                    pickupAddress: b.pickup_address,
                                    lessonTitle: bookingTitle,
                                });
                            }
                        }
                    } catch (e) {
                        console.error('Failed to send booking confirmation email:', e)
                    }
                }
            }
            break

        case 'payment_intent.payment_failed': {
            const pi = event.data.object as Stripe.PaymentIntent
            const { bookingIds: failedBookingIds, bookingId: failedBookingId } = pi.metadata
            const idsToFail = failedBookingIds ? failedBookingIds.split(',') : failedBookingId ? [failedBookingId] : []
            if (idsToFail.length > 0) {
                const { error } = await getServiceRoleClient()
                    .from('bookings')
                    .update({ payment_status: 'failed', status: 'cancelled' })
                    .in('id', idsToFail)
                if (error) console.error('Failed to mark bookings as failed:', error.message)
                else console.log(`Marked ${idsToFail.length} booking(s) as failed/cancelled`)
            }
            break
        }

        default:
            console.log(`Unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })
}
