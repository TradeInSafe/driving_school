import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/adminAuth'
import { getServiceRoleClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    if (!verifyAdminSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const db = getServiceRoleClient()
    const { data, error } = await db.from('vehicle_hires').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
    if (!verifyAdminSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { title, description, vehicle_type, duration_minutes, price } = await request.json()
    if (!title || !vehicle_type || !price) {
        return NextResponse.json({ error: 'title, vehicle_type and price are required' }, { status: 400 })
    }
    const db = getServiceRoleClient()
    const { data, error } = await db
        .from('vehicle_hires')
        .insert({ title, description, vehicle_type, duration_minutes: duration_minutes || 60, price })
        .select()
        .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
