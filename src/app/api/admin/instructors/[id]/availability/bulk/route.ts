import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/adminAuth'
import { getServiceRoleClient } from '@/lib/supabase'

// POST: Set availability for every day in a month range.
// Replaces existing specific_date entries in that range; recurring (day_of_week) entries are untouched.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyAdminSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { startMonth, endMonth, start_time = '07:00', end_time = '19:00' } = await request.json()

    if (!startMonth || !endMonth) {
        return NextResponse.json({ error: 'startMonth and endMonth are required (YYYY-MM)' }, { status: 400 })
    }
    if (start_time >= end_time) {
        return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 })
    }

    // Build the full date range in UTC to avoid local-timezone edge cases
    // rangeStart = first day of startMonth at midnight UTC
    const rangeStart = new Date(`${startMonth}-01T00:00:00Z`)
    // rangeEnd = last day of endMonth at midnight UTC
    // Date.UTC(year, monthIndex, 0) → day-0 of the NEXT month = last day of endMonth
    const [endYear, endMonthNum] = endMonth.split('-').map(Number)
    const rangeEnd = new Date(Date.UTC(endYear, endMonthNum, 0))

    if (rangeStart > rangeEnd) {
        return NextResponse.json({ error: 'Start month must be before or equal to end month' }, { status: 400 })
    }

    // Collect all dates in range as YYYY-MM-DD strings (UTC-based)
    const dates: string[] = []
    const cursor = new Date(rangeStart)
    while (cursor <= rangeEnd) {
        dates.push(cursor.toISOString().slice(0, 10))
        cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    const db = getServiceRoleClient()

    // Delete existing specific_date entries for this instructor in the date range
    const { error: deleteError } = await db
        .from('availability')
        .delete()
        .eq('instructor_id', id)
        .gte('specific_date', dates[0])
        .lte('specific_date', dates[dates.length - 1])
        .not('specific_date', 'is', null)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    // Insert one entry per day
    const slots = dates.map(date => ({
        instructor_id: id,
        specific_date: date,
        day_of_week: new Date(date + 'T00:00:00').getDay(),
        start_time,
        end_time,
        is_active: true,
    }))

    const { error: insertError } = await db.from('availability').insert(slots)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({ success: true, slots_created: slots.length })
}
