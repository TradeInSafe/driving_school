import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/adminAuth'
import { getServiceRoleClient } from '@/lib/supabase'

// POST: Clear all availability for an instructor and re-seed all 7 days with given start/end times
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyAdminSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { start_time = '07:00', end_time = '19:00' } = await request.json()

    if (start_time >= end_time) {
        return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 })
    }

    const db = getServiceRoleClient()

    // Clear existing availability for this instructor
    const { error: deleteError } = await db
        .from('availability')
        .delete()
        .eq('instructor_id', id)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    // Re-insert all 7 days
    const slots = [0, 1, 2, 3, 4, 5, 6].map(day => ({
        instructor_id: id,
        day_of_week: day,
        start_time,
        end_time,
        is_active: true,
    }))

    const { error: insertError } = await db.from('availability').insert(slots)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({ success: true, slots_created: 7 })
}
