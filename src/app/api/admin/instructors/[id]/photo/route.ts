import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/adminAuth'
import { getServiceRoleClient } from '@/lib/supabase'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!verifyAdminSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const formData = await request.formData()
    const file = formData.get('photo') as File | null

    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const db = getServiceRoleClient()
    const ext = file.name.split('.').pop()
    const path = `instructors/${id}/photo.${ext}`

    const { error: uploadError } = await db.storage
        .from('assets')
        .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = db.storage.from('assets').getPublicUrl(path)
    const photo_url = urlData.publicUrl

    const { error: updateError } = await db
        .from('instructors')
        .update({ photo_url })
        .eq('id', id)

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ photo_url })
}
