import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { getServiceRoleClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    const session = await getSessionUser(request)
    if (!session) {
        return NextResponse.json({ user: null }, { status: 401 })
    }

    const db = getServiceRoleClient()
    const { data: user } = await db
        .from('users')
        .select('id, email, full_name, phone, address, gender, license_number, license_expiry')
        .eq('id', session.id)
        .single()

    if (!user) {
        return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({ user })
}
