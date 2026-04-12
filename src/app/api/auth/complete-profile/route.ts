import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { getServiceRoleClient } from '@/lib/supabase'

export async function PATCH(request: NextRequest) {
    const session = await getSessionUser(request)
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { full_name, phone, address, gender, license_number, license_expiry } = await request.json()

    if (!full_name || !phone || !address || !gender) {
        return NextResponse.json({ error: 'Full name, mobile, address and gender are required.' }, { status: 400 })
    }

    const db = getServiceRoleClient()
    const { error } = await db
        .from('users')
        .update({
            full_name,
            phone,
            address,
            gender,
            license_number: license_number || null,
            license_expiry: license_expiry || null,
        })
        .eq('id', session.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
