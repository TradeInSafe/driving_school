'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Shield, Save, LogOut, Camera } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
    const { user, profile, signOut, loading: authLoading } = useAuth()
    const [fullName, setFullName] = useState('')
    const [bio, setBio] = useState('')
    const [experience, setExperience] = useState<number>(0)
    const [carModel, setCarModel] = useState('')
    const [languages, setLanguages] = useState<string>('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '')
            setBio(profile.bio || '')
            setExperience(profile.experience_years || 0)
            setCarModel(profile.car_model || '')
            setLanguages(profile.languages?.join(', ') || 'English')
            setAvatarUrl(profile.avatar_url || '')
        }
    }, [profile])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setLoading(true)
        setMessage(null)

        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: fullName,
                    bio: bio,
                    experience_years: experience,
                    car_model: carModel,
                    languages: languages.split(',').map(s => s.trim()).filter(Boolean),
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString(),
                })

            if (error) throw error
            setMessage({ type: 'success', text: 'Profile updated successfully!' })
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update profile' })
        } finally {
            setLoading(false)
        }
    }

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

            const { error: profileError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id)

            if (profileError) throw profileError

            setAvatarUrl(publicUrl)
            setMessage({ type: 'success', text: 'Avatar updated successfully!' })
        } catch (err: any) {
            console.error('Avatar upload error:', err.message)
            setMessage({ type: 'error', text: 'Failed to upload avatar: ' + err.message })
        } finally {
            setIsUploadingAvatar(false)
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
                        <div className="relative inline-block">
                            <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center overflow-hidden border-2 border-accent/20">
                                {profile?.avatar_url || avatarUrl ? (
                                    <img src={avatarUrl || profile?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-10 h-10 text-accent" />
                                )}
                            </div>
                            <label className={`absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg border border-border transition-colors ${isUploadingAvatar ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted cursor-pointer'}`}>
                                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isUploadingAvatar} />
                                <Camera className="w-4 h-4 text-primary" />
                            </label>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{profile?.full_name || 'My Profile'}</h3>
                            <p className="text-xs text-accent font-bold uppercase tracking-widest">{profile?.role}</p>
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
                            <p className="text-muted-foreground">Manage your personal information and account preferences</p>
                        </div>

                        {message && (
                            <div className={`px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-1 ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-600' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                                <p>{message.text}</p>
                            </div>
                        )}

                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <input
                                            type="text"
                                            required
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Your Name"
                                            className="w-full bg-muted/50 border-border border rounded-xl pl-12 pr-5 py-4 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Avatar Profile Picture</label>
                                    <div className="flex items-center gap-4 bg-muted/30 p-4 border border-border rounded-xl">
                                        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center overflow-hidden border-2 border-accent/20 shrink-0">
                                            {avatarUrl ? (
                                                <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-6 h-6 text-accent" />
                                            )}
                                        </div>
                                        <div className="flex-grow flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold">Upload new photo</p>
                                                <p className="text-xs text-muted-foreground">Larger images will be resized.</p>
                                            </div>
                                            <label className="cursor-pointer">
                                                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isUploadingAvatar} />
                                                <div className={`text-xs font-bold uppercase tracking-widest border border-border px-4 py-2 rounded-full flex items-center gap-2 transition-colors ${isUploadingAvatar ? 'opacity-50' : 'hover:bg-accent hover:text-white bg-white text-black'}`}>
                                                    <Camera className="w-4 h-4" />
                                                    {isUploadingAvatar ? 'Uploading...' : 'Upload'}
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {profile?.role === 'instructor' && (
                                    <>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Bio / About Me</label>
                                            <textarea
                                                rows={4}
                                                value={bio}
                                                onChange={(e) => setBio(e.target.value)}
                                                placeholder="Tell students about your teaching style and experience..."
                                                className="w-full bg-muted/50 border-border border rounded-xl px-5 py-4 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none resize-none"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Years of Experience</label>
                                            <input
                                                type="number"
                                                value={experience}
                                                onChange={(e) => setExperience(parseInt(e.target.value))}
                                                className="w-full bg-muted/50 border-border border rounded-xl px-5 py-4 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Car Model</label>
                                            <input
                                                type="text"
                                                value={carModel}
                                                onChange={(e) => setCarModel(e.target.value)}
                                                placeholder="e.g. Toyota Corolla 2023"
                                                className="w-full bg-muted/50 border-border border rounded-xl px-5 py-4 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                            />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Languages (comma separated)</label>
                                            <input
                                                type="text"
                                                value={languages}
                                                onChange={(e) => setLanguages(e.target.value)}
                                                placeholder="e.g. English, Spanish, Mandarin"
                                                className="w-full bg-muted/50 border-border border rounded-xl px-5 py-4 focus:ring-2 focus:ring-accent focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="pt-6 border-t border-border">
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
