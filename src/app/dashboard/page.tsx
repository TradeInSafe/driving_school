'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, BookOpen, Package, ChevronRight, AlertCircle, CheckCircle2, XCircle, User, MapPin, Star, Zap, Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Booking, Lesson } from '@/types/database'
import Link from 'next/link'

export default function StudentDashboard() {
    const { user, profile, loading: authLoading } = useAuth()
    const [bookings, setBookings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) {
            checkStripeRedirect()
            fetchBookings()
        }
    }, [user])

    const checkStripeRedirect = async () => {
        const searchParams = new URLSearchParams(window.location.search)
        if (searchParams.get('redirect_status') === 'succeeded') {
            // The user just completed a payment that required a full redirect
            try {
                await supabase
                    .from('bookings')
                    .update({ payment_status: 'paid' })
                    .eq('student_id', user?.id)
                    .eq('payment_status', 'pending')

                // Remove the URL parameters gently
                window.history.replaceState({}, document.title, window.location.pathname)
                fetchBookings() // Refresh the view
            } catch (err) {
                console.error('Failed to confirm redirected payment:', err)
            }
        }
    }

    const fetchBookings = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    instructor:profiles!instructor_id(full_name, phone),
                    lesson:lessons(*)
                `)
                .eq('student_id', user?.id)
                .order('start_time', { ascending: true })

            if (error) throw error
            if (data) setBookings(data)
        } catch (err: any) {
            console.error('Error fetching bookings:', err.message || JSON.stringify(err))
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = async (bookingId: string) => {
        // Students are no longer allowed to cancel directly from the dashboard
        alert('Please call your trainer directly to reschedule or cancel this lesson.')
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    const upcomingBookings = bookings.filter(b => b.status === 'scheduled' && new Date(b.start_time) > new Date())
    const pastBookings = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled')
    const totalHours = bookings.reduce((acc, b) => acc + (b.lesson?.duration_minutes || 0), 0) / 60

    // Suggest recommendation based on last completed lesson
    const lastCompleted = bookings.filter(b => b.status === 'completed').sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0]
    const hasCredits = (profile?.credits_remaining || 0) > 0

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold font-outfit">Student Dashboard</h1>
                    <p className="text-muted-foreground">Welcome back, {profile?.full_name || 'Student'}</p>
                </div>
                <div className="flex gap-4">
                    {hasCredits && (
                        <Link href={`/book${lastCompleted ? `?instructorId=${lastCompleted.instructor_id}&lessonId=${lastCompleted.lesson_id}` : ''}`}>
                            <Button variant="accent" size="lg" className="rounded-2xl gap-2 shadow-xl shadow-accent/20">
                                <CheckCircle2 className="w-5 h-5" /> Book with Credit
                            </Button>
                        </Link>
                    )}
                    <Link href="/book">
                        <Button size="lg" className="rounded-2xl gap-2 shadow-xl hover:shadow-accent/20">
                            <Calendar className="w-5 h-5" /> Book New Lesson
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Recommendation Banner - Only if has credits and previous lessons */}
            {hasCredits && lastCompleted && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-accent text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Star className="w-48 h-48 fill-white" />
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
                                <Zap className="w-4 h-4" /> Recommended for you
                            </div>
                            <h2 className="text-3xl font-bold font-outfit">Continue your progress with {lastCompleted.instructor?.full_name}</h2>
                            <p className="text-white/80 max-w-xl">You have {profile?.credits_remaining} credits left. Students who book lessons weekly are 3x more likely to pass their test on the first try!</p>
                        </div>
                        <Link href={`/book?instructorId=${lastCompleted.instructor_id}&lessonId=${lastCompleted.lesson_id}`}>
                            <Button variant="secondary" size="lg" className="h-16 px-10 rounded-2xl text-lg font-bold">
                                Book Next Lesson
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border p-8 rounded-3xl shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-4xl font-bold">{upcomingBookings.length}</p>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Upcoming Lessons</p>
                    </div>
                </div>
                <div className="bg-card border border-border p-8 rounded-3xl shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-secondary/20 rounded-2xl flex items-center justify-center text-secondary-foreground">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-4xl font-bold">{pastBookings.filter(b => b.status === 'completed').length}</p>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Lessons Completed</p>
                    </div>
                </div>
                <div className="bg-card border border-border p-8 rounded-3xl shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                        <Package className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-4xl font-bold">{profile?.credits_remaining || 0}</p>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Lesson Credits</p>
                        {profile?.package_expiry && (
                            <p className="text-[10px] text-muted-foreground mt-1 font-bold">Expires: {new Date(profile.package_expiry).toLocaleDateString()}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Upcoming Lessons */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold font-outfit">Current Schedule</h2>
                        <Link href="/book" className="text-sm font-bold text-accent hover:underline">View Calendar</Link>
                    </div>

                    <div className="space-y-4">
                        {upcomingBookings.length > 0 ? (
                            upcomingBookings.map((booking) => (
                                <motion.div
                                    key={booking.id}
                                    whileHover={{ x: 5 }}
                                    className="bg-card border border-border p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6"
                                >
                                    <div className="flex items-center gap-6 w-full md:w-auto">
                                        <div className="bg-accent/10 p-4 rounded-2xl text-accent hidden md:block">
                                            <Clock className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-lg">{booking.lesson?.title}</h4>
                                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                <User className="w-4 h-4" /> {booking.instructor?.full_name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center md:items-end gap-2">
                                        <div className="text-right">
                                            <p className="font-bold">{new Date(booking.start_time).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                                            <p className="text-sm text-muted-foreground">{new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            {booking.pickup_address && (
                                                <p className="text-[10px] text-accent mt-1 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {booking.pickup_address} ({booking.transmission_type})
                                                </p>
                                            )}
                                        </div>
                                        {booking.instructor?.phone ? (
                                            <a
                                                href={`tel:${booking.instructor.phone}`}
                                                className="flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-xl text-xs font-bold hover:bg-accent/20 transition-colors"
                                            >
                                                <Phone className="w-3 h-3" /> Call to Reschedule
                                            </a>
                                        ) : (
                                            <div className="text-[10px] text-muted-foreground font-medium italic">
                                                Contact office to reschedule
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="bg-muted p-12 rounded-3xl text-center space-y-6 border-2 border-dashed border-border">
                                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                    <Calendar className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-bold text-xl">No lessons scheduled</h3>
                                    <p className="text-muted-foreground max-w-xs mx-auto text-sm">You haven't booked any lessons yet. Start your journey today!</p>
                                </div>
                                <Link href="/book">
                                    <Button variant="secondary" className="rounded-xl">Book Your First Lesson</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar: Packages & History */}
                <div className="space-y-8">
                    <div className="bg-primary rounded-[2.5rem] p-8 text-primary-foreground space-y-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Package className="w-24 h-24" />
                        </div>
                        <div className="space-y-2 relative">
                            <h3 className="text-xl font-bold font-outfit">Lesson Packages</h3>
                            <p className="text-primary-foreground/60 text-sm">Save up to 15% with our multi-lesson bundles.</p>
                        </div>
                        <div className="pt-4 relative">
                            <Link href="/lessons">
                                <Button variant="secondary" className="w-full rounded-xl gap-2">
                                    View Packages <ChevronRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6">
                        <h3 className="font-bold text-lg font-outfit">Recent History</h3>
                        <div className="space-y-6">
                            {pastBookings.length > 0 ? (
                                pastBookings.map((booking) => (
                                    <div key={booking.id} className="flex justify-between items-start gap-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold">{booking.lesson?.title}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(booking.start_time).toLocaleDateString()}</p>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${booking.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {booking.status}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground italic text-center py-4">No past bookings yet.</p>
                            )}
                        </div>
                        <div className="pt-4 border-t border-border">
                            <button className="text-sm font-bold text-accent hover:underline w-full text-center">Download Reports</button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    )
}
