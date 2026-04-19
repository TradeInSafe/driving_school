import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/adminAuth'
import { getServiceRoleClient } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyAdminSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const db = getServiceRoleClient()
    const { data, error } = await db
        .from('availability')
        .select('*')
        .eq('instructor_id', id)
        .order('day_of_week')
        .order('start_time')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyAdminSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { day_of_week, start_time, end_time, specific_date, type = 'available' } = await request.json()

    if (!start_time || !end_time) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (start_time >= end_time) {
        return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 })
    }

    // Derive day_of_week from specific_date if not provided
    const resolvedDayOfWeek = day_of_week !== undefined
        ? day_of_week
        : specific_date ? new Date(specific_date + 'T00:00:00').getDay() : undefined

    const db = getServiceRoleClient()
    const { data, error } = await db
        .from('availability')
        .insert({ instructor_id: id, day_of_week: resolvedDayOfWeek, start_time, end_time, specific_date: specific_date || null, type })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
