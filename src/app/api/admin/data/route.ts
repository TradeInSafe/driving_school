import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/adminAuth'
import { getServiceRoleClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    if (!verifyAdminSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServiceRoleClient()

    const [
        { data: allUsers },
        { data: instructors },
        { data: lessons },
        { data: packagePurchases },
        { data: inquiries },
        { data: allBookings },
        { data: settings },
        { data: vehicleHires },
    ] = await Promise.all([
        db.from('users').select('id, email, full_name, phone, address, gender, license_number, license_expiry').order('full_name', { ascending: true }),
        db.from('instructors').select('*').order('full_name', { ascending: true }),
        db.from('lessons').select('*').order('created_at', { ascending: false }),
        db.from('package_purchases').select('*, student:users(full_name)').order('created_at', { ascending: false }),
        db.from('inquiries').select('*').order('created_at', { ascending: false }),
        db.from('bookings').select('*, lesson:lessons(price)').order('start_time', { ascending: false }),
        db.from('settings').select('*'),
        db.from('vehicle_hires').select('*').order('created_at', { ascending: false }),
    ])

    return NextResponse.json({
        allUsers: allUsers || [],
        instructors: instructors || [],
        lessons: lessons || [],
        packagePurchases: packagePurchases || [],
        inquiries: inquiries || [],
        allBookings: allBookings || [],
        settings: settings || [],
        vehicleHires: vehicleHires || [],
    })
}
