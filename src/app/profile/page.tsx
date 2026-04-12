'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Shield, Save, LogOut, Phone, MapPin, CreditCard, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export default function ProfilePage() {
    const { user, profile, signOut, loading: authLoading, refreshUser } = useAuth()
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState('')
    const [gender, setGender] = useState('')
    const [licenseNumber, setLicenseNumber] = useState('')
    const [licenseExpiry, setLicenseExpiry] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '')
            setPhone(profile.phone || '')
            setAddress(profile.address || '')
            setGender(profile.gender || '')
            setLicenseNumber(profile.license_number || '')
            setLicenseExpiry(profile.license_expiry ? profile.license_expiry.slice(0, 10) : '')
        }
    }, [profile])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: fullName,
                    phone: phone || undefined,
                    address: address || undefined,
                    license_number: licenseNumber || undefined,
                    license_expiry: licenseExpiry || undefined,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to update profile')
            await refreshUser()
            setMessage({ type: 'success', text: 'Profile updated successfully!' })
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update profile' })
        } finally {
            setLoading(false)
        }
    }

    if (authLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 text-center">
                <div className="bg-muted p-6 rounded-full">
                    <Shield className="w-12 h-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold font-outfit">Access Denied</h2>
                    <p className="text-muted-foreground">Please sign in to view your profile.</p>
                </div>
                <Button onClick={() => window.location.href = '/signin'}>Go to Sign In</Button>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row gap-12">
                {/* Sidebar */}
                <aside className="w-full md:w-64 space-y-4">
                    <div className="bg-card border border-border rounded-3xl p-6 text-center space-y-4 shadow-sm">
                        <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto border-2 border-accent/20">
                            <User className="w-10 h-10 text-accent" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{profile?.full_name || 'My Profile'}</h3>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="pt-4 border-t border-border">
                            <Button variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={signOut}>
                                <LogOut className="w-4 h-4" /> Sign Out
                            </Button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-grow space-y-8">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-card border border-border rounded-[2.5rem] p-8 md:p-12 shadow-sm space-y-8"
                    >
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold font-outfit">Profile Settings</h1>
                            <p className="text-muted-foreground">Manage your personal information and licence details</p>
                        </div>

                        {message && (
                            <div className={`px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-1 ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-600' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                                <p>{message.text}</p>
                            </div>
                        )}

                        <form onSubmit={handleUpdateProfile} className="space-y-8">
                            {/* Personal Details */}
                            <div className="space-y-5">
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Personal Details</p>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <input
                                            type="email"
                                            disabled
                                            value={user.email}
                                            className="w-full bg-muted/30 border-border border rounded-xl pl-12 pr-5 py-4 text-muted-foreground cursor-not-allowed outline-none"
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground px-1">Email cannot be changed.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                                                className="w-full bg-muted/50 border-border border rounded-xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Mobile</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                                placeholder="04XX XXX XXX"
                                                className="w-full bg-muted/50 border-border border rounded-xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Gender</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={{ male: 'Male', female: 'Female', non_binary: 'Non-binary', prefer_not_to_say: 'Prefer not to say' }[gender] ?? (gender || 'Not specified')}
                                        className="w-full bg-muted/30 border-border border rounded-xl px-4 py-4 text-muted-foreground cursor-not-allowed outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={address}
                                            onChange={e => setAddress(e.target.value)}
                                            placeholder="123 Main St, Suburb QLD 4000"
                                            className="w-full bg-muted/50 border-border border rounded-xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Licence Details */}
                            <div className="space-y-5 pt-2 border-t border-border">
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 pt-2">Licence Details</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Licence Number</label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <input
                                                type="text"
                                                value={licenseNumber}
                                                onChange={e => setLicenseNumber(e.target.value)}
                                                placeholder="e.g. 012345678"
                                                className="w-full bg-muted/50 border-border border rounded-xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
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
                                                className="w-full bg-muted/50 border-border border rounded-xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button type="submit" size="lg" className="rounded-xl gap-2 min-w-[200px]" isLoading={loading}>
                                    <Save className="w-5 h-5" /> Save Changes
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </main>
            </div>
        </div>
    )
}
