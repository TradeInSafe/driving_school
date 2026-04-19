import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase'

const BUFFER_MINUTES = 30

export async function GET(request: NextRequest) {
    const hireId = request.nextUrl.searchParams.get('hireId')
    if (!hireId) return NextResponse.json({ error: 'Missing hireId' }, { status: 400 })

    const db = getServiceRoleClient()
    const { data, error } = await db
        .from('bookings')
        .select('id, start_time, end_time')
        .eq('hire_id', hireId)
        .eq('status', 'scheduled')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Return each booking plus a buffer block after it
    const events = (data ?? []).flatMap((b: any) => {
        const bookingEnd = new Date(b.end_time)
        const bufferEnd = new Date(bookingEnd.getTime() + BUFFER_MINUTES * 60_000)

        return [
            {
                id: b.id,
                start: b.start_time,
                end: b.end_time,
                title: 'Booked',
                backgroundColor: '#ef4444',
                borderColor: '#dc2626',
                isBooked: true,
            },
            {
                id: `${b.id}-buffer`,
                start: bookingEnd.toISOString(),
                end: bufferEnd.toISOString(),
                title: `${BUFFER_MINUTES}m buffer`,
                isBuffer: true,
            },
        ]
    })

    return NextResponse.json({ events, bufferMinutes: BUFFER_MINUTES })
}
