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
        const { lessonId, bookingIds } = await req.json()

        if (!lessonId) {
            return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 })
        }

        // Fetch lesson price from Supabase
        const { data: lesson, error: lessonError } = await supabase
            .from('lessons')
            .select('price')
            .eq('id', lessonId)
            .single()

        if (lessonError || !lesson) {
            throw new Error('Lesson not found')
        }

        if (!stripe) {
            console.warn('Stripe keys missing - Bypassing payment process for local testing')

            // Mark bookings as "paid" automatically so the dashboard works normally
            await supabase
                .from('bookings')
                .update({ payment_status: 'paid' })
                .in('id', bookingIds.split(','))

            return NextResponse.json({ bypassStripe: true })
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(lesson.price * 100), // Stripe expects amount in cents
            currency: 'aud',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                bookingIds,
            },
        })

        return NextResponse.json({ clientSecret: paymentIntent.client_secret })
    } catch (err: any) {
        console.error('Stripe error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
