'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Users, UserCheck, Calendar, DollarSign, TrendingUp,
    Search, Filter, MoreHorizontal, CheckCircle,
    XCircle, AlertCircle, Plus, LayoutDashboard, ChevronRight, Settings, Upload, Image as ImageIcon
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
    const { user, profile, loading: authLoading } = useAuth()
    const [stats, setStats] = useState({
        totalRevenue: 15420,
        activeBookings: 48,
        pendingInstructors: 2,
        newStudents: 12
    })
    const [recentUsers, setRecentUsers] = useState<any[]>([])
    const [allUsers, setAllUsers] = useState<any[]>([])
    const [lessons, setLessons] = useState<any[]>([])
    const [packagePurchases, setPackagePurchases] = useState<any[]>([])
    const [inquiries, setInquiries] = useState<any[]>([])
    const [allBookings, setAllBookings] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'lessons' | 'users' | 'packages' | 'bookings' | 'settings' | 'payments'>('overview')
    const [showNewLessonModal, setShowNewLessonModal] = useState(false)
    const [showAdjustCreditsModal, setShowAdjustCreditsModal] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [logoUrl, setLogoUrl] = useState<string>('')
    const [isUploadingLogo, setIsUploadingLogo] = useState(false)
    const [showManualBookingModal, setShowManualBookingModal] = useState(false)
    const [bookingData, setBookingData] = useState({
        studentId: '',
        instructorId: '',
        lessonId: '',
        date: '',
        time: '',
        transmission: 'auto',
        deductCredit: true
    })

    useEffect(() => {
        if (user) {
            fetchAdminData()
        }
    }, [user])

    const fetchAdminData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Package Purchases
            try {
                const { data: purchases, error: pError } = await supabase
                    .from('package_purchases')
                    .select('*')
                    .order('created_at', { ascending: false })
                if (pError) console.error("Packages error:", pError)
                else {
                    const packageRevenue = purchases?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0
                    setStats(s => ({ ...s, packageRevenue }))
                }
            } catch (e) { console.error(e) }

            // 2. Fetch Stats & Bookings
            try {
                const { data: bookings, error: bError } = await supabase.from('bookings').select('*, lesson:lessons(price)')
                const { data: profiles, error: prError } = await supabase.from('profiles').select('role')

                const singleLessonRevenue = bookings?.filter(b => b.payment_status === 'paid')
                    .reduce((acc, b) => acc + (b.lesson?.price || 0), 0) || 0

                const activeBookings = bookings?.filter(b => b.status === 'scheduled').length || 0
                const newStudents = profiles?.filter(p => p.role === 'student').length || 0
                const pendingInstructors = profiles?.filter(p => p.role === 'instructor').length || 0

                setStats(s => ({
                    ...s,
                    totalRevenue: singleLessonRevenue + (s as any).packageRevenue || 0,
                    activeBookings,
                    pendingInstructors,
                    newStudents
                }))
            } catch (e) { console.error(e) }

            // 3. Fetch Recent Users
            try {
                const { data: users, error: uError } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('updated_at', { ascending: false })
                    .limit(10)

                if (users) {
                    setRecentUsers(users.map(u => ({
                        id: u.id,
                        name: u.full_name || 'Anonymous',
                        email: u.email || 'N/A',
                        role: u.role,
                        status: u.status || 'active',
                        joined: new Date(u.updated_at).toLocaleDateString()
                    })))
                }
            } catch (e) { console.error(e) }

            // 4. Fetch Lessons
            try {
                const { data: lessonData, error: lError } = await supabase
                    .from('lessons')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (lessonData) setLessons(lessonData)
            } catch (e) { console.error(e) }

            // 5. Fetch All Users for Management
            try {
                const { data: userData, error: allUError } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('full_name', { ascending: true })

                if (userData) setAllUsers(userData)
            } catch (e) { console.error(e) }

            // 6. Fetch Complete Package Purchases for Table
            try {
                const { data: fullPurchases, error: fpError } = await supabase
                    .from('package_purchases')
                    .select(`
                        *,
                        student:profiles(full_name)
                    `)
                    .order('created_at', { ascending: false })

                if (fpError) console.error("Full purchases error:", fpError)
                if (fullPurchases) setPackagePurchases(fullPurchases)
            } catch (e) { console.error(e) }

            // 7. Fetch Inquiries
            try {
                const { data: inquiryData } = await supabase
                    .from('inquiries')
                    .select('*')
                    .order('created_at', { ascending: false })
                if (inquiryData) setInquiries(inquiryData)
            } catch (e) { console.error(e) }

            // 8. Fetch All Bookings for Management
            try {
                const { data: allBookingsData, error: allBError } = await supabase
                    .from('bookings')
                    .select(`
                        *
                    `)
                    .order('start_time', { ascending: false })
                
                if (allBError) {
                    console.error("All bookings error:", allBError)
                } else if (allBookingsData) {
                    // Manual join just in case foreign keys fail
                    setAllBookings(allBookingsData)
                }
            } catch (e) { console.error(e) }

            // 9. Fetch Settings (Logo URL)
            try {
                const { data: settings } = await supabase.from('settings').select('*')
                if (settings) {
                    const logoSetting = settings.find(s => s.key === 'logo_url')
                    if (logoSetting?.value) setLogoUrl(logoSetting.value)
                }
            } catch (e) { console.error(e) }
        } catch(generalError) {
             console.error("Fatal fetchAdminData error:", generalError);
        } finally {
            setLoading(false)
        }
    }

    const adjustStudentCredits = async (studentId: string, amount: number) => {
        try {
            // Get current credits
            const { data: profile } = await supabase
                .from('profiles')
                .select('credits_remaining')
                .eq('id', studentId)
                .single()

            const newCredits = Math.max(0, (profile?.credits_remaining || 0) + amount)

            const { error } = await supabase
                .from('profiles')
                .update({ credits_remaining: newCredits })
                .eq('id', studentId)

            if (error) throw error
            fetchAdminData()
            setShowAdjustCreditsModal(null)
        } catch (err) {
            alert('Error adjusting credits')
        }
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploadingLogo(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `logo_${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(fileName, file, { cacheControl: '3600', upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(fileName)

            const { error: settingsError } = await supabase
                .from('settings')
                .upsert({ key: 'logo_url', value: publicUrl })

            if (settingsError) throw settingsError

            setLogoUrl(publicUrl)
            alert('Logo updated successfully!')
        } catch (err: any) {
            console.error('Logo upload error:', err.message)
            alert('Failed to upload logo: ' + err.message)
        } finally {
            setIsUploadingLogo(false)
        }
    }

    const updateUserRole = async (userId: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId)
            if (error) throw error
            fetchAdminData()
        } catch (err) {
            alert('Error updating user role')
        }
    }

    const toggleLessonStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('lessons')
                .update({ is_active: !currentStatus })
                .eq('id', id)
            if (error) throw error
            fetchAdminData()
        } catch (err) {
            alert('Error updating lesson')
        }
    }

    const deleteUser = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', id)
            if (error) throw error
            fetchAdminData()
        } catch(err: any) { alert('Error deleting user: ' + err.message) }
    }

    const deleteLesson = async (id: string) => {
        if (!confirm('Are you sure you want to delete this lesson? This cannot be undone.')) return
        try {
            const { error } = await supabase
                .from('lessons')
                .delete()
                .eq('id', id)
            if (error) throw error
            fetchAdminData()
        } catch (err: any) {
            alert('Error deleting lesson: ' + (err.message || 'Check if there are existing bookings for this lesson.'))
        }
    }

    const deleteBooking = async (bookingId: string) => {
        if (!confirm('Are you sure you want to completely delete this booking?')) return
        try {
            const { error } = await supabase
                .from('bookings')
                .delete()
                .eq('id', bookingId)
            if (error) throw error
            fetchAdminData()
        } catch (err: any) {
            alert('Error deleting booking: ' + err.message)
        }
    }

    const handleAddLesson = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const title = formData.get('title') as string
        const price = parseFloat(formData.get('price') as string)
        const duration = parseInt(formData.get('duration') as string)

        try {
            const { error } = await supabase
                .from('lessons')
                .insert({ title, price, duration_minutes: duration })
            if (error) throw error
            setShowNewLessonModal(false)
            fetchAdminData()
        } catch (err) {
            alert('Error adding lesson')
        }
    }

    const handleManualBooking = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const startTime = new Date(`${bookingData.date}T${bookingData.time}`)
            const lesson = lessons.find(l => l.id === bookingData.lessonId)
            const endTime = new Date(startTime.getTime() + (lesson?.duration_minutes || 60) * 60000)

            const { error } = await supabase
                .from('bookings')
                .insert({
                    student_id: bookingData.studentId,
                    instructor_id: bookingData.instructorId,
                    lesson_id: bookingData.lessonId,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    status: 'scheduled',
                    payment_status: 'paid',
                    pickup_address: 'Manual Admin Booking',
                    transmission_type: bookingData.transmission,
                    credits_used: bookingData.deductCredit ? 1 : 0
                })

            if (error) throw error

            if (bookingData.deductCredit) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('credits_remaining')
                    .eq('id', bookingData.studentId)
                    .single()

                await supabase
                    .from('profiles')
                    .update({ credits_remaining: Math.max(0, (profile?.credits_remaining || 0) - 1) })
                    .eq('id', bookingData.studentId)
            }

            alert('Manual booking successful!')
            setShowManualBookingModal(false)
            fetchAdminData()
        } catch (err: any) {
            alert('Error creating manual booking: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    if (authLoading) return null

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-primary p-3 rounded-2xl text-white">
                        <LayoutDashboard className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold font-outfit">Admin Panel</h1>
                        <p className="text-muted-foreground">General system overview and management</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Button
                        variant={activeTab === 'overview' ? 'accent' : 'outline'}
                        className="rounded-2xl"
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </Button>
                    <Button
                        variant={activeTab === 'analytics' ? 'accent' : 'outline'}
                        className="rounded-2xl"
                        onClick={() => setActiveTab('analytics')}
                    >
                        Analytics
                    </Button>
                    <Button
                        variant={activeTab === 'lessons' ? 'accent' : 'outline'}
                        className="rounded-2xl"
                        onClick={() => setActiveTab('lessons')}
                    >
                        Lessons
                    </Button>
                    <Button
                        variant={activeTab === 'users' ? 'accent' : 'outline'}
                        className="rounded-2xl"
                        onClick={() => setActiveTab('users')}
                    >
                        Users
                    </Button>
                    <Button
                        variant={activeTab === 'packages' ? 'accent' : 'outline'}
                        className="rounded-2xl"
                        onClick={() => setActiveTab('packages')}
                    >
                        Packages
                    </Button>
                    <Button
                        variant={activeTab === 'bookings' ? 'accent' : 'outline'}
                        className="rounded-2xl"
                        onClick={() => setActiveTab('bookings')}
                    >
                        Bookings
                    </Button>
                    <Button
                        variant={activeTab === 'payments' ? 'accent' : 'outline'}
                        className="rounded-2xl"
                        onClick={() => setActiveTab('payments')}
                    >
                        Payments
                    </Button>
                    <Button
                        variant={activeTab === 'settings' ? 'accent' : 'outline'}
                        className="rounded-2xl"
                        onClick={() => setActiveTab('settings')}
                    >
                        Settings
                    </Button>
                </div>
            </header>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Revenue', value: `$${stats.totalRevenue}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100', trend: '+12.5%' },
                    { label: 'Active Bookings', value: stats.activeBookings, icon: Calendar, color: 'text-accent', bg: 'bg-accent/10', trend: '+5.2%' },
                    { label: 'New Students', value: stats.newStudents, icon: Users, color: 'text-secondary', bg: 'bg-secondary/20', trend: '+18.1%' },
                    { label: 'Pending Apps', value: stats.pendingInstructors, icon: UserCheck, color: 'text-orange-600', bg: 'bg-orange-100', trend: 'N/A' },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4"
                    >
                        <div className="flex justify-between items-start">
                            <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            {stat.trend !== 'N/A' && (
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> {stat.trend}
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                            <p className="text-3xl font-bold">{stat.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Main Content Area based on activeTab */}
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'overview' && (
                        <>
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold font-outfit">Recent User Registrations</h2>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        className="pl-10 pr-4 py-2 bg-muted/50 border-border border rounded-xl text-sm focus:ring-2 focus:ring-accent outline-none w-64"
                                    />
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-muted/50 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                            <th className="px-6 py-5">User</th>
                                            <th className="px-6 py-5">Role</th>
                                            <th className="px-6 py-5">Status</th>
                                            <th className="px-6 py-5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {recentUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-muted/30 transition-colors group">
                                                <td className="px-6 py-4 text-sm font-medium">{u.name}</td>
                                                <td className="px-6 py-4 capitalize text-sm">{u.role}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {u.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="sm">Manage</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-sm space-y-6">
                                    <h3 className="text-xl font-bold font-outfit">Revenue Distribution</h3>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'Individual Lessons', value: 45, color: 'bg-accent' },
                                            { label: 'Beginner Packages', value: 30, color: 'bg-primary' },
                                            { label: 'Pro Packages', value: 25, color: 'bg-secondary' },
                                        ].map(item => (
                                            <div key={item.label} className="space-y-2">
                                                <div className="flex justify-between text-sm font-bold">
                                                    <span>{item.label}</span>
                                                    <span>{item.value}%</span>
                                                </div>
                                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${item.value}%` }}
                                                        className={`h-full ${item.color}`}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-sm space-y-6">
                                    <h3 className="text-xl font-bold font-outfit">Popular Lessons</h3>
                                    <div className="space-y-4">
                                        {lessons.slice(0, 3).map((lesson, i) => (
                                            <div key={lesson.id} className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold text-xs">
                                                    #{i + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm">{lesson.title}</p>
                                                    <p className="text-xs text-muted-foreground">{Math.floor(Math.random() * 20) + 10} bookings this month</p>
                                                </div>
                                                <div className="text-accent font-bold">${lesson.price}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-sm">
                                <h3 className="text-xl font-bold font-outfit mb-8">Monthly Growth</h3>
                                <div className="h-48 flex items-end gap-2 px-4">
                                    {[35, 45, 30, 65, 85, 45, 75, 95].map((h, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${h}%` }}
                                                className="w-full bg-accent/20 group-hover:bg-accent rounded-t-lg transition-colors relative"
                                            >
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                    ${h * 100}
                                                </div>
                                            </motion.div>
                                            <span className="text-[10px] font-bold text-muted-foreground">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][i]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'lessons' && (
                        <>
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold font-outfit">Manage Lessons</h2>
                                <Button size="sm" className="rounded-xl gap-2" onClick={() => setShowNewLessonModal(true)}>
                                    <Plus className="w-4 h-4" /> New Lesson
                                </Button>
                            </div>

                            {showNewLessonModal && (
                                <div className="bg-muted/30 p-6 rounded-2xl border border-border space-y-4">
                                    <h3 className="font-bold">Add New Lesson</h3>
                                    <form onSubmit={handleAddLesson} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <input name="title" placeholder="Lesson Title" required className="bg-background border border-border p-2 rounded-lg" />
                                        <input name="price" type="number" step="0.01" placeholder="Price" required className="bg-background border border-border p-2 rounded-lg" />
                                        <input name="duration" type="number" placeholder="Duration (mins)" required className="bg-background border border-border p-2 rounded-lg" />
                                        <div className="md:col-span-3 flex justify-end gap-2">
                                            <Button type="button" variant="ghost" onClick={() => setShowNewLessonModal(false)}>Cancel</Button>
                                            <Button type="submit">Save Lesson</Button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-muted/50 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                            <th className="px-6 py-5">Title</th>
                                            <th className="px-6 py-5">Price</th>
                                            <th className="px-6 py-5">Duration</th>
                                            <th className="px-6 py-5">Status</th>
                                            <th className="px-6 py-5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {lessons.map(lesson => (
                                            <tr key={lesson.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium">{lesson.title}</td>
                                                <td className="px-6 py-4 text-sm font-bold">${lesson.price}</td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground">{lesson.duration_minutes}m</td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => toggleLessonStatus(lesson.id, lesson.is_active)}
                                                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${lesson.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                                    >
                                                        {lesson.is_active ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" className="text-accent" onClick={() => alert('Editing coming soon!')}>Edit</Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500"
                                                        onClick={() => deleteLesson(lesson.id)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                    {activeTab === 'users' && (
                        <>
                            <div className="flex justify-between items-center text-sm">
                                <h2 className="text-2xl font-bold font-outfit">User Management</h2>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        className="pl-10 pr-4 py-2 bg-muted/50 border-border border rounded-xl text-sm focus:ring-2 focus:ring-accent outline-none w-64"
                                    />
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-muted/50 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                            <th className="px-6 py-5">Name</th>
                                            <th className="px-6 py-5">Role</th>
                                            <th className="px-6 py-5">Credits</th>
                                            <th className="px-6 py-5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {allUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-medium text-sm">{u.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">{u.phone || 'No phone'}</p>
                                                </td>
                                                <td className="px-6 py-4 capitalize text-sm">
                                                    <select
                                                        value={u.role}
                                                        onChange={(e) => updateUserRole(u.id, e.target.value)}
                                                        className="bg-transparent border-none font-medium cursor-pointer focus:ring-0"
                                                    >
                                                        <option value="student">Student</option>
                                                        <option value="instructor">Instructor</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {u.role === 'student' ? (
                                                        <div className="flex items-center gap-3 relative">
                                                            <span className="font-bold text-accent">{u.credits_remaining || 0}</span>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 px-2 text-[10px] rounded-lg"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setShowAdjustCreditsModal(showAdjustCreditsModal === u.id ? null : u.id);
                                                                }}
                                                            >
                                                                Adjust
                                                            </Button>
                                                            {showAdjustCreditsModal === u.id && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    className="absolute left-0 top-full mt-2 z-50 bg-white border border-border p-4 rounded-2xl shadow-2xl flex flex-col gap-3 min-w-[160px]"
                                                                >
                                                                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Quick Adjust</p>
                                                                    <div className="flex gap-2">
                                                                        <Button size="sm" variant="accent" className="flex-1" onClick={() => adjustStudentCredits(u.id, 1)}>+1</Button>
                                                                        <Button size="sm" variant="secondary" className="flex-1" onClick={() => adjustStudentCredits(u.id, -1)}>-1</Button>
                                                                    </div>
                                                                    <div className="h-px bg-border" />
                                                                    <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => setShowAdjustCreditsModal(null)}>Close</Button>
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <Button variant="ghost" size="sm" className="text-accent underline" onClick={() => alert('Editing coming soon!')}>Edit</Button>
                                                    <Button variant="ghost" size="sm" className="text-red-500 underline" onClick={() => deleteUser(u.id)}>Delete</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {activeTab === 'bookings' && (
                        <>
                            <div className="flex justify-between items-center text-sm">
                                <h2 className="text-2xl font-bold font-outfit">All Bookings</h2>
                                <div className="flex gap-4">
                                    <Button size="sm" variant="outline" className="rounded-xl gap-2" onClick={() => fetchAdminData()}>
                                        Refresh
                                    </Button>
                                    <Button size="sm" className="rounded-xl gap-2" onClick={() => setShowManualBookingModal(true)}>
                                        <Plus className="w-4 h-4" /> New Booking
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-muted/50 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                            <th className="px-6 py-5">Student</th>
                                            <th className="px-6 py-5">Instructor</th>
                                            <th className="px-6 py-5">Lesson</th>
                                            <th className="px-6 py-5">Date & Time</th>
                                            <th className="px-6 py-5">Status</th>
                                            <th className="px-6 py-5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {allBookings.map(b => {
                                            const student = allUsers.find(u => u.id === b.student_id);
                                            const instructor = allUsers.find(u => u.id === b.instructor_id);
                                            const lesson = lessons.find(l => l.id === b.lesson_id);
                                            return (
                                            <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-medium text-sm">{student?.full_name || 'Unknown'}</p>
                                                    <p className="text-xs text-muted-foreground">{student?.email || 'No email'}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm">{instructor?.full_name || 'Unknown'}</td>
                                                <td className="px-6 py-4 text-sm font-medium">{lesson?.title || 'Custom'}</td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm">{new Date(b.start_time).toLocaleDateString()}</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${b.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                                            b.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                'bg-red-100 text-red-700'
                                                        }`}>
                                                        {b.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="sm" className="text-accent underline" onClick={() => alert('Editing coming soon!')}>Edit</Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:bg-red-50"
                                                        onClick={() => deleteBooking(b.id)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {activeTab === 'packages' && (
                        <>
                            <div className="flex justify-between items-center text-sm">
                                <h2 className="text-2xl font-bold font-outfit">Package Purchase History</h2>
                                <div className="flex gap-2">
                                    <div className="p-3 bg-accent/10 rounded-2xl">
                                        <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Total Volume</p>
                                        <p className="text-xl font-bold">${packagePurchases.reduce((acc, p) => acc + (p.amount || 0), 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-muted/50 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                            <th className="px-6 py-5">Student</th>
                                            <th className="px-6 py-5">Package</th>
                                            <th className="px-6 py-5">Amount</th>
                                            <th className="px-6 py-5">Date</th>
                                            <th className="px-6 py-5 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {packagePurchases.map(purchase => (
                                            <tr key={purchase.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 font-medium text-sm">
                                                    {purchase.student?.full_name || 'Deleted User'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-primary/5 text-primary text-[10px] font-bold rounded uppercase">
                                                        {purchase.package_type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-sm">${purchase.amount}</td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground">
                                                    {new Date(purchase.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-green-600 font-bold text-[10px] uppercase flex items-center justify-end gap-1">
                                                        <CheckCircle className="w-3 h-3" /> Fulfilled
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {packagePurchases.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-12 text-center text-muted-foreground italic">
                                                    No package purchases found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {activeTab === 'payments' && (
                        <>
                            <div className="flex justify-between items-center text-sm">
                                <h2 className="text-2xl font-bold font-outfit">Stripe Payments</h2>
                                <Button size="sm" className="rounded-xl gap-2">Export CSV</Button>
                            </div>
                            <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-muted/50 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                            <th className="px-6 py-5">Date</th>
                                            <th className="px-6 py-5">Type / Detail</th>
                                            <th className="px-6 py-5">Amount</th>
                                            <th className="px-6 py-5">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {[
                                            ...packagePurchases.map(p => ({
                                                id: p.id,
                                                date: new Date(p.created_at),
                                                type: `Package: ${p.package_type}`,
                                                amount: p.amount,
                                                status: 'Paid'
                                            })),
                                            ...allBookings.filter(b => b.payment_status === 'paid').map(b => {
                                                const lesson = lessons.find(l => l.id === b.lesson_id);
                                                return {
                                                    id: b.id,
                                                    date: new Date(b.created_at),
                                                    type: `Lesson: ${lesson?.title || 'Unknown'}`,
                                                    amount: lesson?.price || 0,
                                                    status: 'Paid'
                                                };
                                            })
                                        ].sort((a, b) => b.date.getTime() - a.date.getTime()).map(p => (
                                            <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 text-sm text-muted-foreground">{p.date.toLocaleDateString()} {p.date.toLocaleTimeString()}</td>
                                                <td className="px-6 py-4 text-sm font-medium">{p.type}</td>
                                                <td className="px-6 py-4 text-sm font-bold">${p.amount}</td>
                                                <td className="px-6 py-4"><span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full">{p.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-8">
                            <div className="bg-card border border-border rounded-[2.5rem] p-12 text-center space-y-6 shadow-sm">
                                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto text-accent">
                                    <Settings className="w-8 h-8" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold font-outfit">Global System Settings</h2>
                                    <p className="text-muted-foreground">Manage your site-wide configurations and branding.</p>
                                </div>
                            </div>

                            <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-sm space-y-6">
                                <h3 className="text-xl font-bold font-outfit flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5 text-accent" /> Dynamic Logo Management
                                </h3>
                                <div className="flex flex-col md:flex-row items-center gap-8 bg-muted/30 p-8 rounded-3xl border border-border">
                                    <div className="w-48 h-48 bg-white rounded-2xl border-4 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0 relative group">
                                        {logoUrl ? (
                                            <img src={logoUrl} alt="Site Logo" className="w-full h-full object-contain p-4" />
                                        ) : (
                                            <div className="text-center text-muted-foreground">
                                                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                <span className="text-xs font-bold uppercase tracking-widest">No Logo</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                            <label className="cursor-pointer">
                                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={isUploadingLogo} />
                                                <div className="bg-white text-black text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 uppercase tracking-widest hover:bg-accent hover:text-white transition-colors">
                                                    <Upload className="w-4 h-4" />
                                                    {isUploadingLogo ? 'Uploading...' : 'Replace'}
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-bold">Primary Logo</h4>
                                            <p className="text-sm text-muted-foreground mt-1">This logo will replace the text-based placeholder in the main navigation bar and footer across the entire site.</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Requirements:</p>
                                            <ul className="text-sm text-foreground/80 list-disc list-inside space-y-1">
                                                <li>Recommended size: 400x100 pixels</li>
                                                <li>Format: PNG (transparent background) or SVG</li>
                                                <li>Max file size: 2MB</li>
                                            </ul>
                                        </div>
                                        <label className="cursor-pointer inline-block mt-2">
                                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={isUploadingLogo} />
                                            <Button disabled={isUploadingLogo} className="gap-2">
                                                <Upload className="w-4 h-4" />
                                                {logoUrl ? 'Update Logo' : 'Upload Logo'}
                                            </Button>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-card rounded-3xl border border-border shadow-sm">
                                    <p className="font-bold text-lg mb-1">Maintenance Mode</p>
                                    <p className="text-sm text-muted-foreground mb-4">Temporarily disable site access for updates.</p>
                                    <div className="flex bg-muted rounded-full p-1 w-max">
                                        <div className="px-4 py-1.5 rounded-full text-sm font-bold bg-white shadow-sm">Off</div>
                                        <div className="px-4 py-1.5 rounded-full text-sm font-medium text-muted-foreground cursor-not-allowed">On</div>
                                    </div>
                                </div>
                                <div className="p-6 bg-card rounded-3xl border border-border shadow-sm flex flex-col items-start">
                                    <p className="font-bold text-lg mb-1">Google Calendar Sync</p>
                                    <p className="text-sm text-muted-foreground mb-4">Sync bookings automatically to your primary Google Calendar and block out existing events.</p>
                                    <Button
                                        className="gap-2"
                                        onClick={() => window.location.href = '/api/calendar/auth'}
                                    >
                                        <Calendar className="w-4 h-4" /> Connect Calendar
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-2 italic">Connect only the main instructor's account.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar: System Alerts & Quick Actions */}
                <div className="space-y-8">
                    <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6">
                        <h3 className="font-bold text-lg font-outfit flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-500" /> System Alerts
                        </h3>
                        <div className="space-y-4">
                            {inquiries.filter(i => i.status === 'new').map(inq => (
                                <div key={inq.id} className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3">
                                    <Users className="w-5 h-5 text-orange-500 shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-orange-800">New Inquiry: {inq.full_name}</p>
                                        <p className="text-xs text-orange-700/70">{inq.interest || inq.message?.slice(0, 50)}</p>
                                        <button className="text-xs font-bold text-orange-800 underline">Contact Now</button>
                                    </div>
                                </div>
                            ))}
                            {inquiries.filter(i => i.status === 'new').length === 0 && (
                                <p className="text-xs text-muted-foreground italic text-center py-4">No new inquiries.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-primary rounded-[2.5rem] p-8 text-primary-foreground space-y-6 shadow-2xl">
                        <h3 className="text-xl font-bold font-outfit">Global Settings</h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => setShowManualBookingModal(true)}
                                className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-left flex justify-between items-center group"
                            >
                                <span className="text-sm font-bold">Manual Booking</span>
                                <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                            </button>
                            <button className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-left flex justify-between items-center group">
                                <span className="text-sm font-bold">Lesson Pricing</span>
                                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                            </button>
                            <button className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-left flex justify-between items-center group">
                                <span className="text-sm font-bold">Package Bundles</span>
                                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                            </button>
                            <button className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-left flex justify-between items-center group">
                                <span className="text-sm font-bold">Email Templates</span>
                                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                            </button>
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
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleManualBooking} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Student</label>
                                <select
                                    required
                                    className="w-full bg-muted border border-border p-3 rounded-xl outline-none"
                                    value={bookingData.studentId}
                                    onChange={(e) => setBookingData({ ...bookingData, studentId: e.target.value })}
                                >
                                    <option value="">Select Student</option>
                                    {allUsers.filter(u => u.role === 'student').map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Instructor</label>
                                <select
                                    required
                                    className="w-full bg-muted border border-border p-3 rounded-xl outline-none"
                                    value={bookingData.instructorId}
                                    onChange={(e) => setBookingData({ ...bookingData, instructorId: e.target.value })}
                                >
                                    <option value="">Select Instructor</option>
                                    {allUsers.filter(u => u.role === 'instructor').map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name}</option>
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
                                    {lessons.map(l => (
                                        <option key={l.id} value={l.id}>{l.title}</option>
                                    ))}
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

                            <div className="flex items-center gap-3 pt-4">
                                <input
                                    type="checkbox"
                                    id="deduct"
                                    checked={bookingData.deductCredit}
                                    onChange={(e) => setBookingData({ ...bookingData, deductCredit: e.target.checked })}
                                    className="w-5 h-5 rounded border-border text-accent focus:ring-accent"
                                />
                                <label htmlFor="deduct" className="text-sm font-bold">Deduct 1 Credit from Student</label>
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
        </div>
    )
}
