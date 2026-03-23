'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ChevronRight, User, MapPin, Search, ArrowRight, ShieldCheck, Camera, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function InstructorOnboarding() {
    const { user, profile, loading: authLoading } = useAuth()
    const router = useRouter()

    // Form logic
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Step 1: Basic Info
    const [bio, setBio] = useState('')
    const [experience, setExperience] = useState<number>(0)

    // Step 2: Location & Languages
    const [address, setAddress] = useState('')
    const [languages, setLanguages] = useState('English')

    // Step 3: Vehicle & Photo
    const [carModel, setCarModel] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

    useEffect(() => {
        // Redirect if not logged in or not an instructor
        if (!authLoading && !user) {
            router.push('/signin')
        }

        // If they already have basic data, maybe redirect them to their dashboard
        if (!authLoading && profile?.role !== 'instructor') {
            setMessage({ type: 'error', text: 'This onboarding is only for instructors. Please contact support if you need your account upgraded.' })
        }
    }, [user, profile, authLoading, router])

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user) return

        setIsUploadingAvatar(true)
        setMessage(null)

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(fileName, file, { cacheControl: '3600', upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(fileName)
            setAvatarUrl(publicUrl)
        } catch (err: any) {
            console.error('Avatar upload error:', err.message)
            setMessage({ type: 'error', text: 'Failed to upload image: ' + err.message })
        } finally {
            setIsUploadingAvatar(false)
        }
    }

    const handleCompleteOnboarding = async () => {
        if (!user) return
        setLoading(true)
        setMessage(null)

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    bio: bio,
                    experience_years: experience,
                    address: address,
                    languages: languages.split(',').map(s => s.trim()).filter(Boolean),
                    car_model: carModel,
                    avatar_url: avatarUrl || profile?.avatar_url,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)

            if (error) throw error

            // Redirect to dashboard on success
            router.push('/instructor')
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to complete onboarding' })
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

    if (profile?.role !== 'instructor') {
        return (
            <div className="max-w-xl mx-auto pt-20 px-4 py-32 text-center space-y-6">
                <ShieldCheck className="w-16 h-16 text-muted-foreground mx-auto" />
                <h2 className="text-2xl font-bold font-outfit">Access Restricted</h2>
                <p className="text-muted-foreground">It looks like your account is registered as a student. This onboarding process is only for Brisbane Bayside instructors.</p>
                <div className="pt-4">
                    <Button onClick={() => router.push('/')}>Back to Home</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted/30 pt-10 pb-20">
            <div className="max-w-3xl mx-auto px-4">
                {/* Progress Header */}
                <div className="mb-12">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-2 ${step >= s ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' : 'bg-card text-muted-foreground border-border'}`}>
                                    {step > s ? <Check className="w-5 h-5" /> : s}
                                </div>
                                <span className={`text-xs font-bold uppercase tracking-widest hidden sm:block ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {s === 1 ? 'About You' : s === 2 ? 'Location' : 'Vehicle & Verification'}
                                </span>
                            </div>
                        ))}
                    </div>
                    {/* Progress Bar background */}
                    <div className="relative mt-[-3rem] mb-12 sm:mt-[-4.5rem]">
                        <div className="absolute top-5 left-[10%] right-[10%] h-1 bg-border -z-10 rounded-full">
                            <motion.div
                                className="h-full bg-accent rounded-full transition-all duration-500 ease-in-out"
                                style={{ width: `${((step - 1) / 2) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {message && (
                    <div className={`mb-8 px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-1 ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-600' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                        <p>{message.text}</p>
                    </div>
                )}

                {/* Form Content */}
                <div className="bg-card border border-border p-8 md:p-12 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="space-y-2 text-center md:text-left">
                                    <h1 className="text-3xl font-bold font-outfit">Welcome aboard, {profile?.full_name?.split(' ')[0]}!</h1>
                                    <p className="text-muted-foreground">Let's craft your profile. This is what students will see when booking lessons with you.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Professional Bio</label>
                                        <textarea
                                            rows={5}
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="I'm a patient and experienced instructor passionate about helping nervous drivers build confidence..."
                                            className="w-full bg-muted/50 border-border border rounded-2xl px-5 py-4 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none resize-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Years of Experience</label>
                                        <input
                                            type="number"
                                            value={experience || ''}
                                            onChange={(e) => setExperience(parseInt(e.target.value) || 0)}
                                            placeholder="e.g. 5"
                                            className="w-full md:w-1/2 bg-muted/50 border-border border rounded-2xl px-5 py-4 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-border mt-8">
                                    <Button onClick={() => setStep(2)} size="lg" className="rounded-xl gap-2 h-14 w-full md:w-auto">
                                        Continue <ArrowRight className="w-5 h-5" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="space-y-2 text-center md:text-left">
                                    <h1 className="text-3xl font-bold font-outfit">Where do you teach?</h1>
                                    <p className="text-muted-foreground">Add your main service area and the languages you speak fluently.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Primary Base Area</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <input
                                                type="text"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                placeholder="e.g. South Brisbane, QLD"
                                                className="w-full bg-muted/50 border-border border rounded-2xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Languages Spoken (comma separated)</label>
                                        <input
                                            type="text"
                                            value={languages}
                                            onChange={(e) => setLanguages(e.target.value)}
                                            placeholder="English, Mandarin, Hindi"
                                            className="w-full bg-muted/50 border-border border rounded-2xl px-5 py-4 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-border mt-8">
                                    <Button onClick={() => setStep(1)} variant="ghost" className="rounded-xl text-muted-foreground hover:text-foreground">
                                        Back
                                    </Button>
                                    <Button onClick={() => setStep(3)} size="lg" className="rounded-xl gap-2 h-14">
                                        Continue <ArrowRight className="w-5 h-5" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="space-y-2 text-center md:text-left">
                                    <h1 className="text-3xl font-bold font-outfit">Final details</h1>
                                    <p className="text-muted-foreground">Add a welcoming photo and your vehicle details to complete your profile.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Profile Photo</label>
                                        <div className="flex flex-col md:flex-row items-center gap-6 bg-muted/30 p-6 rounded-2xl border border-border">
                                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-sm border-2 border-border relative group">
                                                {avatarUrl || profile?.avatar_url ? (
                                                    <img src={avatarUrl || profile?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-10 h-10 text-muted-foreground/30" />
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                    <label className="cursor-pointer">
                                                        <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isUploadingAvatar} />
                                                        <Camera className="w-6 h-6 text-white" />
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="text-center md:text-left flex-grow">
                                                <h4 className="font-bold">Upload a clear headshot</h4>
                                                <p className="text-xs text-muted-foreground mt-1 mb-3">Students book more often when they can see their instructor.</p>
                                                <label className="cursor-pointer">
                                                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isUploadingAvatar} />
                                                    <div className={`inline-flex items-center gap-2 bg-white border border-border px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${isUploadingAvatar ? 'opacity-50' : 'hover:bg-accent hover:border-accent hover:text-white'}`}>
                                                        <Camera className="w-4 h-4" />
                                                        {isUploadingAvatar ? 'Uploading...' : 'Choose File'}
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Teaching Vehicle</label>
                                        <input
                                            type="text"
                                            value={carModel}
                                            onChange={(e) => setCarModel(e.target.value)}
                                            placeholder="e.g. 2023 Toyota Corolla Hybrid (Auto)"
                                            className="w-full bg-muted/50 border-border border rounded-2xl px-5 py-4 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-border mt-8">
                                    <Button onClick={() => setStep(2)} variant="ghost" className="rounded-xl text-muted-foreground hover:text-foreground w-full md:w-auto">
                                        Back
                                    </Button>
                                    <Button onClick={handleCompleteOnboarding} size="lg" className="rounded-xl gap-2 h-14 w-full md:w-auto shadow-xl hover:shadow-accent/20" isLoading={loading}>
                                        Complete Profile <CheckCircle2 className="w-5 h-5" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
