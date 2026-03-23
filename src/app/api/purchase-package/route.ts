import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripeBase = process.env.STRIPE_SECRET_KEY as string
const stripe = stripeBase ? new Stripe(stripeBase, {
    apiVersion: '2026-02-25.clover',
}) : null

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(req: Request) {
    try {
        const { packageId, studentId } = await req.json()

        if (!packageId || !studentId) {
            return NextResponse.json({ error: 'Package ID and Student ID are required' }, { status: 400 })
        }

        // Fetch package details (from lessons table)
        const { data: pkg, error: pkgError } = await supabase
            .from('lessons')
            .select('*')
            .eq('id', packageId)
            .single()

        if (pkgError || !pkg) {
            throw new Error('Package not found')
        }

        // Determine credits based on title or description if not in DB yet
        let credits = 1
        if (pkg.title.includes('5')) credits = 5
        else if (pkg.title.includes('10')) credits = 10

        if (!stripe) {
            console.warn('Stripe key missing - bypassing package payment process for testing')

            // Fetch current profile to get exact existing credits
            const { data: profile } = await supabase
                .from('profiles')
                .select('lesson_credits')
                .eq('id', studentId)
                .single()

            const existingCredits = profile?.lesson_credits || 0

            // Manually add credits and bypass
            await supabase
                .from('profiles')
                .update({ lesson_credits: existingCredits + credits })
                .eq('id', studentId)

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
