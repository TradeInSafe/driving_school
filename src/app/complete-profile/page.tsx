'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, Phone, MapPin, CreditCard, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export default function CompleteProfilePage() {
    const router = useRouter()
    const { user, loading: authLoading, refreshUser } = useAuth()
    const [redirect, setRedirect] = useState('/dashboard')

    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState('')
    const [gender, setGender] = useState('')
    const [licenseNumber, setLicenseNumber] = useState('')
    const [licenseExpiry, setLicenseExpiry] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('redirect')) setRedirect(params.get('redirect')!)
    }, [])

    useEffect(() => {
        if (!authLoading && user) {
            setFullName(user.full_name || '')
        }
    }, [authLoading, user])

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/signin')
        }
    }, [authLoading, user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/auth/complete-profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: fullName,
                    phone,
                    address,
                    gender,
                    license_number: licenseNumber || undefined,
                    license_expiry: licenseExpiry || undefined,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to save profile')
            await refreshUser()
            router.push(redirect)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (authLoading) return null

    return (
        <div className="min-h-[90vh] flex items-center justify-center p-4 bg-muted/30">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl w-full bg-card border border-border p-8 md:p-12 rounded-[2.5rem] shadow-2xl space-y-8"
            >
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-7 h-7 text-accent" />
                    </div>
                    <h1 className="text-2xl font-bold font-outfit">Complete Your Profile</h1>
                    <p className="text-muted-foreground text-sm">We need a few more details before you can book a lesson.</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Personal Details */}
                    <div className="space-y-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Personal Details</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Full Name *</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        placeholder="Jane Doe"
                                        className="w-full bg-muted/50 border-border border rounded-xl pl-12 pr-5 py-3.5 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Mobile *</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="04XX XXX XXX"
                                        className="w-full bg-muted/50 border-border border rounded-xl pl-12 pr-5 py-3.5 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Gender *</label>
                            <select
                                required
                                value={gender}
                                onChange={e => setGender(e.target.value)}
                                className="w-full bg-muted/50 border-border border rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none text-sm"
                            >
                                <option value="">Select gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="non_binary">Non-binary</option>
                                <option value="prefer_not_to_say">Prefer not to say</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Address *</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="text"
                                    required
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    placeholder="123 Main St, Suburb QLD 4000"
                                    className="w-full bg-muted/50 border-border border rounded-xl pl-12 pr-5 py-3.5 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Licence Details */}
                    <div className="space-y-4 pt-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Licence Details <span className="normal-case font-normal">(optional)</span></p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Licence Number</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={licenseNumber}
                                        onChange={e => setLicenseNumber(e.target.value)}
                                        placeholder="e.g. 012345678"
                                        className="w-full bg-muted/50 border-border border rounded-xl pl-12 pr-5 py-3.5 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Licence Expiry</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="date"
                                        value={licenseExpiry}
                                        onChange={e => setLicenseExpiry(e.target.value)}
                                        className="w-full bg-muted/50 border-border border rounded-xl pl-12 pr-5 py-3.5 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button type="submit" size="lg" className="w-full h-14 rounded-xl gap-2" isLoading={loading}>
                        Save & Continue <CheckCircle2 className="w-5 h-5" />
                    </Button>
                </form>
            </motion.div>
        </div>
    )
}
