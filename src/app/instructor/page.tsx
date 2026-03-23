'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, Users, CheckCircle2, AlertCircle, Settings, ChevronRight, MapPin, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

export default function InstructorDashboard() {
    const { user, profile, loading: authLoading } = useAuth()
    const [lessons, setLessons] = useState<any[]>([])
    const [availability, setAvailability] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showAvailabilityForm, setShowAvailabilityForm] = useState(false)
    const [inquiries, setInquiries] = useState<any[]>([])
    const [allStudents, setAllStudents] = useState<any[]>([])
    const [allLessonTypes, setAllLessonTypes] = useState<any[]>([])
    const [showManualBookingModal, setShowManualBookingModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [editProfile, setEditProfile] = useState({
        bio: '',
        experience_years: 0,
        car_model: '',
        languages: ''
    })
    const [bookingData, setBookingData] = useState({
        studentId: '',
        lessonId: '',
        date: '',
        time: '',
        transmission: 'auto'
    })

    useEffect(() => {
        if (!authLoading) {
            if (user) {
                if (profile?.role === 'instructor' || profile?.role === 'admin') {
                    fetchInstructorData()
                    fetchAvailability()
                    fetchInquiries()
                    fetchFormOptions()
                    setEditProfile({
                        bio: profile.bio || '',
                        experience_years: profile.experience_years || 0,
                        car_model: profile.car_model || '',
                        languages: profile.languages?.join(', ') || 'English'
                    })
                } else {
                    setLoading(false)
                }
            } else {
                setLoading(false)
            }
        }
    }, [user, authLoading, profile])

    const fetchAvailability = async () => {
        try {
            const { data } = await supabase
                .from('availability')
                .select('*')
                .eq('instructor_id', user?.id)
                .order('day_of_week', { ascending: true })
            if (data) setAvailability(data)
        } catch (err) {
            console.error('Error fetching availability:', err)
        }
    }

    const fetchInquiries = async () => {
        try {
            const { data, error } = await supabase
                .from('inquiries')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            if (data) setInquiries(data)
        } catch (err) {
            console.error('Error fetching inquiries:', err)
        }
    }

    const fetchFormOptions = async () => {
        try {
            const { data: students } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('role', 'student')
                .order('full_name', { ascending: true })

            const { data: lessonTypes } = await supabase
                .from('lessons')
                .select('*')
                .eq('is_active', true)
                .order('title', { ascending: true })

            if (students) setAllStudents(students)
            if (lessonTypes) setAllLessonTypes(lessonTypes)
        } catch (err) {
            console.error('Error fetching options:', err)
        }
    }

    const handleManualBooking = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const startTime = new Date(`${bookingData.date}T${bookingData.time}`)
            const lesson = allLessonTypes.find(l => l.id === bookingData.lessonId)
            const endTime = new Date(startTime.getTime() + (lesson?.duration_minutes || 60) * 60000)

            const { error } = await supabase
                .from('bookings')
                .insert({
                    student_id: bookingData.studentId,
                    instructor_id: user?.id,
                    lesson_id: bookingData.lessonId,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    status: 'scheduled',
                    payment_status: 'paid',
                    pickup_address: 'Manual Instructor Booking',
                    transmission_type: bookingData.transmission,
                    credits_used: 1 // Default to 1 for manual instructor bookings
                })

            if (error) throw error

            alert('Booking successful!')
            setShowManualBookingModal(false)
            fetchInstructorData()
        } catch (err: any) {
            alert('Error creating booking: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchInstructorData = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                  *,
                  student:profiles!bookings_student_id_fkey(full_name, phone, email),
                  lesson:lessons(*)
                `)
                .eq('instructor_id', user?.id)
                .order('start_time', { ascending: true })

            if (data) {
                setLessons(data.map(b => ({
                    id: b.id,
                    title: b.lesson?.title,
                    student: b.student?.full_name,
                    studentPhone: b.student?.phone,
                    studentEmail: b.student?.email,
                    start: b.start_time,
                    end: b.end_time,
                    status: b.status,
                    pickup: b.pickup_address,
                    transmission: b.transmission_type
                })))
            }
        } catch (err) {
            console.error('Error fetching instructor data:', err)
        } finally {
            setLoading(false)
        }
    }

    const updateBookingStatus = async (bookingId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: newStatus })
                .eq('id', bookingId)

            if (error) throw error
            fetchInstructorData()
        } catch (err) {
            console.error('Error updating status:', err)
            alert('Failed to update status')
        }
    }

    const handleUpdateSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    bio: editProfile.bio,
                    experience_years: editProfile.experience_years,
                    car_model: editProfile.car_model,
                    languages: editProfile.languages.split(',').map(s => s.trim()).filter(Boolean),
                    updated_at: new Date().toISOString()
                })
                .eq('id', user?.id)

            if (error) throw error
            setShowSettingsModal(false)
            alert('Profile updated successfully!')
        } catch (err: any) {
            alert('Error updating profile: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const copyBookingLink = () => {
        const link = `${window.location.origin}/book?instructorId=${user?.id}`
        navigator.clipboard.writeText(link)
        alert('Booking link copied to clipboard!')
    }

    const handleAddAvailability = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const day = parseInt(formData.get('day') as string)
        const start = formData.get('start') as string
        const end = formData.get('end') as string

        try {
            const { error } = await supabase
                .from('availability')
                .insert({
                    instructor_id: user?.id,
                    day_of_week: day,
                    start_time: start,
                    end_time: end
                })
            if (error) throw error
            fetchAvailability()
            setShowAvailabilityForm(false)
        } catch (err) {
            alert('Error adding availability')
        }
    }

    const handleDeleteAvailability = async (id: string) => {
        try {
            const { error } = await supabase
                .from('availability')
                .delete()
                .eq('id', id)
            if (error) throw error
            fetchAvailability()
        } catch (err) {
            alert('Error deleting availability')
        }
    }

    // Calculate real stats
    const today = new Date().toISOString().split('T')[0]
    const todayLessons = lessons.filter(l => l.start.startsWith(today)).length
    const totalStudents = new Set(lessons.map(l => l.student)).size
    const avgRating = profile?.rating || 5.0

    if (authLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <AlertCircle className="w-12 h-12 text-orange-500" />
                <h2 className="text-2xl font-bold font-outfit">Please Sign In</h2>
                <p className="text-muted-foreground">You must be logged in as an instructor to access this dashboard.</p>
                <Button onClick={() => window.location.href = '/login'}>Sign In</Button>
            </div>
        )
    }

    if (profile?.role !== 'instructor' && profile?.role !== 'admin') {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <h2 className="text-2xl font-bold font-outfit">Access Denied</h2>
                <p className="text-muted-foreground">This dashboard is for instructors only. Your current role is: <strong>{profile?.role}</strong></p>
                <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>Go to Student Dashboard</Button>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    const events = lessons.map(l => ({
        id: l.id,
        title: `${l.title} - ${l.student}`,
        start: l.start,
        end: l.end,
        backgroundColor: '#0047AB',
        borderColor: '#0047AB',
        extendedProps: { student: l.student, status: l.status }
    }))

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold font-outfit">Instructor Dashboard</h1>
                    <p className="text-muted-foreground">Managing your teaching schedule</p>
                </div>
                <div className="flex gap-4">
                    <Button
                        variant="accent"
                        className="rounded-2xl gap-2 shadow-xl shadow-accent/20"
                        onClick={() => setShowManualBookingModal(true)}
                    >
                        + Manual Booking
                    </Button>
                    <Button
                        variant="outline"
                        className="rounded-2xl gap-2 h-11"
                        onClick={() => setShowSettingsModal(true)}
                    >
                        <Settings className="w-5 h-5" /> Settings
                    </Button>
                    <Button
                        onClick={() => setShowAvailabilityForm(!showAvailabilityForm)}
                        variant={showAvailabilityForm ? 'accent' : 'secondary'}
                        className="rounded-2xl gap-2 shadow-xl hover:shadow-accent/20 h-11"
                    >
                        <Clock className="w-5 h-5" /> {showAvailabilityForm ? 'View Schedule' : 'Availability'}
                    </Button>
                    <Button
                        onClick={copyBookingLink}
                        variant="ghost"
                        className="rounded-2xl gap-2 h-11 text-accent font-bold"
                    >
                        Share Link
                    </Button>
                </div>
            </header>

            {showAvailabilityForm && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border p-8 rounded-[2.5rem] shadow-xl space-y-8"
                >
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold font-outfit">Manage Weekly Availability</h2>
                    </div>

                    <form onSubmit={handleAddAvailability} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-muted/30 p-6 rounded-2xl border border-border/50">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Day</label>
                            <select name="day" className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium">
                                <option value="1">Monday</option>
                                <option value="2">Tuesday</option>
                                <option value="3">Wednesday</option>
                                <option value="4">Thursday</option>
                                <option value="5">Friday</option>
                                <option value="6">Saturday</option>
                                <option value="0">Sunday</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Start Time</label>
                            <input name="start" type="time" required className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">End Time</label>
                            <input name="end" type="time" required className="w-full bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium" />
                        </div>
                        <Button type="submit" className="rounded-xl h-[46px]">Add Slot</Button>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availability.map((a) => (
                            <div key={a.id} className="flex justify-between items-center p-4 bg-background border border-border rounded-xl group hover:border-accent/40 transition-all">
                                <div className="space-y-1">
                                    <p className="font-bold text-sm">{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][a.day_of_week]}</p>
                                    <p className="text-xs text-muted-foreground">{a.start_time.slice(0, 5)} - {a.end_time.slice(0, 5)}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteAvailability(a.id)}
                                >
                                    Delete
                                </Button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Today's Lessons</p>
                    <p className="text-3xl font-bold">{todayLessons}</p>
                </div>
                <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Lessons</p>
                    <p className="text-3xl font-bold">{lessons.length}</p>
                </div>
                <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Students</p>
                    <p className="text-3xl font-bold">{totalStudents}</p>
                </div>
                <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Avg Rating</p>
                    <p className="text-3xl font-bold text-secondary">{avgRating}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Calendar View */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-xl overflow-hidden">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold font-outfit">Weekly Schedule</h2>
                            <div className="flex gap-2">
                                <div className="flex items-center gap-2 text-xs font-bold px-3 py-1 bg-accent/10 text-accent rounded-full">
                                    <div className="w-2 h-2 bg-accent rounded-full" /> Booked
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold px-3 py-1 bg-muted text-muted-foreground rounded-full">
                                    <div className="w-2 h-2 bg-muted-foreground/30 rounded-full" /> Available
                                </div>
                            </div>
                        </div>
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'timeGridWeek,timeGridDay'
                            }}
                            events={events}
                            slotMinTime="07:00:00"
                            slotMaxTime="20:00:00"
                            height="auto"
                            allDaySlot={false}
                        />
                    </div>
                </div>

                {/* Sidebar: Next Lessons */}
                <div className="space-y-8">
                    <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6">
                        <h3 className="font-bold text-lg font-outfit">Next Lessons</h3>
                        <div className="space-y-6">
                            {lessons.filter(l => l.status === 'scheduled').map(lesson => (
                                <div key={lesson.id} className="p-4 bg-muted/50 rounded-2xl space-y-3 border border-transparent hover:border-border transition-colors">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-bold text-accent uppercase tracking-widest leading-none">
                                            {new Date(lesson.start).toLocaleDateString() === today ? 'Today' : new Date(lesson.start).toLocaleDateString()}
                                        </span>
                                        <span className="text-xs font-bold text-muted-foreground">{new Date(lesson.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-bold text-lg">{lesson.student}</p>
                                        <div className="flex flex-col gap-2 pt-1 pb-2">
                                            <div className="flex gap-2">
                                                {lesson.studentPhone && (
                                                    <a href={`tel:${lesson.studentPhone}`} className="flex-1 py-1.5 px-3 bg-accent/5 border border-accent/10 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold text-accent hover:bg-accent hover:text-white transition-all">
                                                        <Phone className="w-3 h-3" /> Call
                                                    </a>
                                                )}
                                                {lesson.studentEmail && (
                                                    <a href={`mailto:${lesson.studentEmail}`} className="flex-1 py-1.5 px-3 bg-primary/5 border border-primary/10 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold text-primary hover:bg-primary hover:text-white transition-all">
                                                        <Mail className="w-3 h-3" /> Email
                                                    </a>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground space-y-1.5 px-1">
                                                <p className="flex items-center gap-1.5 font-medium">
                                                    <MapPin className="w-3 h-3 text-accent" /> {lesson.pickup || 'Address not provided'}
                                                </p>
                                                <p className="flex items-center gap-1.5 font-medium">
                                                    <Settings className="w-3 h-3 text-accent" /> {lesson.transmission === 'manual' ? 'Manual' : 'Automatic'} • {lesson.title}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-2 flex justify-between items-center border-t border-border/10 gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 text-[10px] h-8 rounded-lg bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                            onClick={() => updateBookingStatus(lesson.id, 'completed')}
                                        >
                                            Complete
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 text-[10px] h-8 rounded-lg bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                            onClick={() => updateBookingStatus(lesson.id, 'cancelled')}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {lessons.filter(l => l.status === 'scheduled').length === 0 && (
                                <p className="text-sm text-muted-foreground italic text-center py-4">No upcoming lessons.</p>
                            )}
                        </div>
                        <Button variant="ghost" className="w-full text-accent font-bold">View Full Roster</Button>
                    </div>

                    <div className="bg-secondary p-8 rounded-[2.5rem] text-secondary-foreground space-y-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Users className="w-24 h-24" />
                        </div>
                        <div className="space-y-2 relative">
                            <h3 className="text-xl font-bold font-outfit">New Inquiries</h3>
                            <p className="text-secondary-foreground/70 text-sm">
                                {inquiries.length > 0
                                    ? `You have ${inquiries.filter(i => i.status === 'new').length} new students waiting for response.`
                                    : "No new inquiries at the moment."}
                            </p>
                        </div>
                        <div className="pt-4 relative space-y-3">
                            {inquiries.slice(0, 2).map(inq => (
                                <div key={inq.id} className="p-3 bg-white/10 rounded-xl border border-white/5 space-y-1">
                                    <p className="text-xs font-bold leading-none">{inq.full_name}</p>
                                    <p className="text-[10px] opacity-70 truncate">{inq.message || inq.interest}</p>
                                </div>
                            ))}
                            <Button className="w-full rounded-xl bg-primary text-white hover:bg-primary/90 border-none shadow-lg">
                                {inquiries.length > 0 ? 'Review All Inquiries' : 'Check Inquiries'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Manual Booking Modal */}
            {showManualBookingModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card border border-border w-full max-w-xl rounded-[2.5rem] shadow-2xl p-10 space-y-8 overflow-y-auto max-h-[90vh]"
                    >
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold font-outfit">Manual Lesson Booking</h2>
                            <button onClick={() => setShowManualBookingModal(false)} className="p-2 hover:bg-muted rounded-full">
                                <AlertCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleManualBooking} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Student</label>
                                <select
                                    required
                                    className="w-full bg-muted border border-border p-3 rounded-xl outline-none"
                                    value={bookingData.studentId}
                                    onChange={(e) => setBookingData({ ...bookingData, studentId: e.target.value })}
                                >
                                    <option value="">Select Student</option>
                                    {allStudents.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Lesson Type</label>
                                <select
                                    required
                                    className="w-full bg-muted border border-border p-3 rounded-xl outline-none"
                                    value={bookingData.lessonId}
                                    onChange={(e) => setBookingData({ ...bookingData, lessonId: e.target.value })}
                                >
                                    <option value="">Select Lesson</option>
                                    {allLessonTypes.map(l => (
                                        <option key={l.id} value={l.id}>{l.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Transmission</label>
                                <select
                                    className="w-full bg-muted border border-border p-3 rounded-xl outline-none"
                                    value={bookingData.transmission}
                                    onChange={(e) => setBookingData({ ...bookingData, transmission: e.target.value })}
                                >
                                    <option value="auto">Automatic</option>
                                    <option value="manual">Manual</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full bg-muted border border-border p-3 rounded-xl outline-none"
                                    value={bookingData.date}
                                    onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Time</label>
                                <input
                                    type="time"
                                    required
                                    className="w-full bg-muted border border-border p-3 rounded-xl outline-none"
                                    value={bookingData.time}
                                    onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })}
                                />
                            </div>

                            <div className="col-span-2 pt-6">
                                <Button type="submit" size="lg" className="w-full rounded-2xl h-14 text-lg">
                                    Finalize Booking
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
            {/* Instructor Settings Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card border border-border w-full max-w-xl rounded-[2.5rem] shadow-2xl p-10 space-y-8 overflow-y-auto max-h-[90vh]"
                    >
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold font-outfit">Instructor Settings</h2>
                            <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-muted rounded-full">
                                <AlertCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateSettings} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">About You (Bio)</label>
                                <textarea
                                    className="w-full bg-muted border border-border p-3 rounded-xl outline-none resize-none h-32"
                                    value={editProfile.bio}
                                    onChange={(e) => setEditProfile({ ...editProfile, bio: e.target.value })}
                                    placeholder="Tell students about your teaching style..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Experience (Years)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-muted border border-border p-3 rounded-xl outline-none"
                                        value={editProfile.experience_years}
                                        onChange={(e) => setEditProfile({ ...editProfile, experience_years: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Teaching Vehicle</label>
                                    <input
                                        type="text"
                                        className="w-full bg-muted border border-border p-3 rounded-xl outline-none"
                                        value={editProfile.car_model}
                                        onChange={(e) => setEditProfile({ ...editProfile, car_model: e.target.value })}
                                        placeholder="e.g. 2023 Toyota Camry"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Languages Spoken</label>
                                <input
                                    type="text"
                                    className="w-full bg-muted border border-border p-3 rounded-xl outline-none"
                                    value={editProfile.languages}
                                    onChange={(e) => setEditProfile({ ...editProfile, languages: e.target.value })}
                                    placeholder="English, Mandarin..."
                                />
                            </div>

                            <div className="pt-6">
                                <Button type="submit" size="lg" className="w-full rounded-2xl h-14 text-lg">
                                    Save Profile Changes
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
