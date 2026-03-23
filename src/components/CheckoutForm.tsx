'use client'

import React, { useState } from 'react'
import {
    PaymentElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js'
import { Button } from './ui/Button'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface CheckoutFormProps {
    amount: number
    onSuccess: () => void
}

export default function CheckoutForm({ amount, onSuccess }: CheckoutFormProps) {
    const stripe = useStripe()
    const elements = useElements()
    const [message, setMessage] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!stripe || !elements) {
            return
        }

        setIsLoading(true)

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/dashboard`,
            },
            redirect: 'if_required',
        })

        if (error) {
            if (error.type === "card_error" || error.type === "validation_error") {
                setMessage(error.message || 'An error occurred during payment.')
            } else {
                setMessage("An unexpected error occurred.")
            }
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onSuccess()
        }

        setIsLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement id="payment-element" options={{ layout: 'tabs' }} />

            {message && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{message}</p>
                </div>
            )}

            <Button
                disabled={isLoading || !stripe || !elements}
                id="submit"
                size="lg"
                className="w-full h-16 rounded-2xl text-xl gap-2 shadow-xl shadow-accent/20"
                isLoading={isLoading}
            >
                <span>Confirm and Pay ${amount}</span>
                <CheckCircle2 className="w-6 h-6" />
            </Button>
        </form>
    )
}
