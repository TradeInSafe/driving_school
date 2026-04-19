import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase'
import { sendBookingConfirmationEmail } from '@/lib/email'
import { syncBookingToCalendar } from '@/lib/calendar'

export async function POST(request: NextRequest) {
    try {
        const { bookingIds } = await request.json()
        if (!bookingIds) return NextResponse.json({ error: 'Missing bookingIds' }, { status: 400 })

        const ids: string[] = bookingIds.split(',')
        const db = getServiceRoleClient()

        const { data: bookings, error } = await db
            .from('bookings')
            .select('id, start_time, pickup_address, student_id, instructor_id, lesson_id, hire_id, payment_status')
            .in('id', ids)

        if (error || !bookings?.length) return NextResponse.json({ ok: true }) // silently skip

        // Mark bookings as paid (webhook may not fire in dev/if misconfigured)
        await db.from('bookings').update({ payment_status: 'paid' }).in('id', ids)

        const first = bookings[0]

        const [studentResult, instructorResult, lessonResult, hireResult] = await Promise.all([
            db.from('users').select('full_name, email').eq('id', first.student_id).single(),
            first.instructor_id
                ? db.from('instructors').select('full_name, email').eq('id', first.instructor_id).single()
                : Promise.resolve({ data: null }),
            first.lesson_id
                ? db.from('lessons').select('title').eq('id', first.lesson_id).single()
                : Promise.resolve({ data: null }),
            first.hire_id
                ? db.from('vehicle_hires').select('title').eq('id', first.hire_id).single()
                : Promise.resolve({ data: null }),
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
                startTime: first.start_time,
                pickupAddress: first.pickup_address,
                transmissionType: '',
            })
        }

        // Sync all bookings in this batch to Google Calendar
        for (const id of ids) {
            await syncBookingToCalendar(id)
        }

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error('Notify error:', err.message)
        return NextResponse.json({ ok: true }) // never fail the client
    }
}
