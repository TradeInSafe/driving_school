import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServiceRoleClient } from '@/lib/supabase'

function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) return null
    return new Stripe(key, { apiVersion: '2026-02-25.clover' })
}

export async function POST(req: Request) {
    try {
        const { packageId, studentId } = await req.json()

        if (!packageId || !studentId) {
            return NextResponse.json({ error: 'Package ID and Student ID are required' }, { status: 400 })
        }

        const db = getServiceRoleClient()

        // Fetch package details (from lessons table)
        const { data: pkg, error: pkgError } = await db
            .from('lessons')
            .select('*')
            .eq('id', packageId)
            .single()

        if (pkgError || !pkg) {
            throw new Error('Package not found')
        }

        // Determine credits: use lesson_count for packages, else infer from title
        let credits = pkg.lesson_count || 1
        if (credits <= 1) {
            if (pkg.title.includes('10')) credits = 10
            else if (pkg.title.includes('5')) credits = 5
        }

        const stripe = getStripe()

        if (!stripe) {
            console.warn('Stripe key missing - bypassing package payment process for testing')

            // Fetch current user profile to get existing credits
            const { data: profile } = await db
                .from('users')
                .select('credits_remaining')
                .eq('id', studentId)
                .single()

            const existingCredits = profile?.credits_remaining || 0

            // Add credits using service role client (bypasses RLS)
            const { error: updateError } = await db
                .from('users')
                .update({ credits_remaining: existingCredits + credits })
                .eq('id', studentId)

            if (updateError) {
                console.error('Credit update error:', updateError.message)
                throw new Error('Failed to update credits: ' + updateError.message)
            }

            return NextResponse.json({ bypassStripe: true })
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(pkg.price * 100),
            currency: 'aud',
            automatic_payment_methods: { enabled: true },
            metadata: {
                studentId,
                packageId,
                creditsAdded: credits.toString(),
                isPackage: 'true'
            },
        })

        return NextResponse.json({ clientSecret: paymentIntent.client_secret })
    } catch (err: any) {
        console.error('Stripe Package Purchase error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
