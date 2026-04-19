'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    Users, UserCheck, Calendar, DollarSign, TrendingUp,
    Search, Filter, MoreHorizontal, CheckCircle,
    XCircle, AlertCircle, Plus, LayoutDashboard, ChevronRight, Settings, Upload, Image as ImageIcon, LogOut,
    Car, Star, Clock, Trash2, Edit2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

function ReportsTab() {
    const today = new Date().toISOString().split('T')[0]
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const [from, setFrom] = React.useState(firstOfMonth)
    const [to, setTo] = React.useState(today)
    const [downloading, setDownloading] = React.useState<string | null>(null)

    const download = async (type: 'bookings' | 'earnings' | 'packages') => {
        setDownloading(type)
        try {
            const res = await fetch(`/api/admin/reports?type=${type}&from=${from}&to=${to}`)
            if (!res.ok) throw new Error('Failed to generate report')
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = res.headers.get('content-disposition')?.split('filename="')[1]?.replace('"', '') ?? `${type}_report.csv`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err: any) {
            alert('Download failed: ' + err.message)
        } finally {
            setDownloading(null)
        }
    }

    const reports = [
        {
            type: 'bookings' as const,
            title: 'Bookings Report',
            description: 'All bookings with student details, instructor, lesson, payment status, and pickup address.',
            icon: '📅',
            color: 'bg-blue-50 border-blue-200',
        },
        {
            type: 'earnings' as const,
            title: 'Earnings by Instructor',
            description: 'Revenue breakdown per instructor — total lessons, earnings, credit vs cash/card splits.',
            icon: '💰',
            color: 'bg-green-50 border-green-200',
        },
        {
            type: 'packages' as const,
            title: 'Package Sales Report',
            description: 'Package purchases with student details, credits added, remaining credits, and expiry dates.',
            icon: '📦',
            color: 'bg-purple-50 border-purple-200',
        },
    ]

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-outfit">Reports & Exports</h2>
                    <p className="text-muted-foreground text-sm mt-1">Download CSV reports for bookings, earnings, and packages.</p>
                </div>
                <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">From</label>
                        <input
                            type="date"
                            value={from}
                            onChange={e => setFrom(e.target.value)}
                            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-muted/50 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <span className="text-muted-foreground">—</span>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">To</label>
                        <input
                            type="date"
                            value={to}
                            onChange={e => setTo(e.target.value)}
                            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-muted/50 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reports.map(r => (
                    <div key={r.type} className={`border rounded-[2rem] p-8 space-y-6 ${r.color}`}>
                        <div className="text-4xl">{r.icon}</div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold font-outfit">{r.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Period: <span className="font-semibold">{from}</span> → <span className="font-semibold">{to}</span>
                        </div>
                        <Button
                            className="w-full rounded-xl gap-2"
                            onClick={() => download(r.type)}
                            isLoading={downloading === r.type}
                        >
                            ⬇ Download CSV
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function AdminDashboard() {
    const router = useRouter()

    const handleLogout = async () => {
        await fetch('/api/admin/logout', { method: 'POST' })
        router.push('/admin/login')
        router.refresh()
    }
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
    const [instructors, setInstructors] = useState<any[]>([])
    const [vehicleHires, setVehicleHires] = useState<any[]>([])
    const [showNewHireModal, setShowNewHireModal] = useState(false)
    const [hireForm, setHireForm] = useState({ title: '', description: '', vehicle_type: 'car', duration_minutes: '60', price: '' })
    const [editingHire, setEditingHire] = useState<any | null>(null)
    const [showNewInstructorModal, setShowNewInstructorModal] = useState(false)
    const [newInstructorForm, setNewInstructorForm] = useState({ full_name: '', email: '', phone: '', bio: '', experience_years: '', car_model: '', languages: 'English', rating: '5' })
    const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'lessons' | 'hires' | 'users' | 'bookings' | 'hire-bookings' | 'settings' | 'payments' | 'instructors' | 'reports'>('overview')

    // Instructor management state
    const [selectedInstructor, setSelectedInstructor] = useState<any | null>(null)
    const [instructorForm, setInstructorForm] = useState({ full_name: '', email: '', bio: '', experience_years: '', car_model: '', languages: '', phone: '', rating: '' })
    const [photoUploading, setPhotoUploading] = useState(false)
    const [bulkAvailForm, setBulkAvailForm] = useState({ startMonth: '', endMonth: '', start_time: '07:00', end_time: '19:00' })
    const [blockedSlotForm, setBlockedSlotForm] = useState({ date: '', start_time: '12:00', end_time: '13:00' })
    const [bulkAvailLoading, setBulkAvailLoading] = useState(false)
    const [instructorAvailability, setInstructorAvailability] = useState<any[]>([])
    const [calendarTooltip, setCalendarTooltip] = useState<{ props: any; x: number; y: number } | null>(null)
    const [availabilityLoading, setAvailabilityLoading] = useState(false)
    const [newSlot, setNewSlot] = useState({ day_of_week: '1', start_time: '09:00', end_time: '17:00' })
    const [addingSlotDay, setAddingSlotDay] = useState<number | null>(null)
    const [daySlotForm, setDaySlotForm] = useState({ start_time: '09:00', end_time: '17:00' })
    const [showNewLessonModal, setShowNewLessonModal] = useState(false)
    const [newLessonIsPackage, setNewLessonIsPackage] = useState(false)
    const [editingLesson, setEditingLesson] = useState<any | null>(null)
    const [lessonEditForm, setLessonEditForm] = useState({
        title: '', description: '', price: '', duration_minutes: '',
        is_package: false, lesson_count: '1', is_active: true,
    })
    const [lessonEditLoading, setLessonEditLoading] = useState(false)
    const [lessonEditError, setLessonEditError] = useState<string | null>(null)
    const [editingUser, setEditingUser] = useState<any | null>(null)
    const [userForm, setUserForm] = useState({ full_name: '', phone: '', address: '' })
    const [userFormLoading, setUserFormLoading] = useState(false)
    const [userFormError, setUserFormError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [logoUrl, setLogoUrl] = useState<string>('')
    const [isUploadingLogo, setIsUploadingLogo] = useState(false)
    const [showManualBookingModal, setShowManualBookingModal] = useState(false)
    const [showNewHireBookingModal, setShowNewHireBookingModal] = useState(false)
    const [hireBookingTab, setHireBookingTab] = useState<'existing' | 'new'>('existing')
    const [hireBookingData, setHireBookingData] = useState({ studentId: '', hireId: '', date: '', time: '', pickupAddress: '', paymentMethod: 'pending' as 'paid' | 'pending' })
    const [hireBookingNewStudent, setHireBookingNewStudent] = useState({ full_name: '', email: '', phone: '', address: '' })
    const [hireBookingError, setHireBookingError] = useState<string | null>(null)
    const [hireBookingLoading, setHireBookingLoading] = useState(false)
    const [showPastBookings, setShowPastBookings] = useState(false)
    const [showPastHireBookings, setShowPastHireBookings] = useState(false)
    const [editingBooking, setEditingBooking] = useState<any | null>(null)
    const [bookingEditForm, setBookingEditForm] = useState({
        instructorId: '', lessonId: '', date: '', time: '',
        status: 'scheduled', paymentStatus: 'pending',
        pickupAddress: '', vehicleType: 'car', transmissionType: 'auto',
    })
    const [bookingEditLoading, setBookingEditLoading] = useState(false)
    const [bookingEditError, setBookingEditError] = useState<string | null>(null)
    const [availableSlots, setAvailableSlots] = useState<{ value: string; label: string }[]>([])
    const [slotsLoading, setSlotsLoading] = useState(false)
    const [slotsMessage, setSlotsMessage] = useState<string | null>(null)
    const [newBookingSlots, setNewBookingSlots] = useState<{ value: string; label: string }[]>([])
    const [newBookingSlotsLoading, setNewBookingSlotsLoading] = useState(false)
    const [newBookingSlotsMessage, setNewBookingSlotsMessage] = useState<string | null>(null)
    const [manualBookingTab, setManualBookingTab] = useState<'existing' | 'new'>('existing')
    const [manualBookingError, setManualBookingError] = useState<string | null>(null)
    const [bookingData, setBookingData] = useState({
        studentId: '',
        instructorId: '',
        lessonId: '',
        date: '',
        time: '',
        transmission: 'auto',
        vehicleType: 'car' as 'car' | 'truck',
        pickupAddress: '',
        paymentMethod: 'pending' as 'paid' | 'pending',
    })
    const [newStudentForm, setNewStudentForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        gender: '',
        license_number: '',
        license_expiry: '',
    })

    useEffect(() => {
        fetchAdminData()
    }, [])

    // Fetch available time slots whenever instructor, date, or lesson changes in the edit modal
    useEffect(() => {
        const { instructorId, date, lessonId } = bookingEditForm
        if (!editingBooking || !instructorId || !date) {
            setAvailableSlots([])
            setSlotsMessage(null)
            return
        }
        const lesson = lessons.find((l: any) => l.id === lessonId)
        const durationMins = lesson?.duration_minutes || 60
        setSlotsLoading(true)
        setSlotsMessage(null)
        setAvailableSlots([])
        fetch(`/api/admin/available-slots?instructorId=${instructorId}&date=${date}&durationMins=${durationMins}&excludeBookingId=${editingBooking.id}`)
            .then(r => r.json())
            .then(({ slots, message }) => {
                setAvailableSlots(slots || [])
                setSlotsMessage(message || (slots?.length === 0 ? 'No available slots on this day.' : null))
            })
            .catch(() => setSlotsMessage('Failed to load available slots.'))
            .finally(() => setSlotsLoading(false))
    }, [bookingEditForm.instructorId, bookingEditForm.date, bookingEditForm.lessonId, editingBooking])

    // Fetch available slots for the new booking modal
    useEffect(() => {
        const { instructorId, date, lessonId } = bookingData
        if (!instructorId || !date) {
            setNewBookingSlots([])
            setNewBookingSlotsMessage(null)
            return
        }
        const lesson = lessons.find((l: any) => l.id === lessonId)
        const durationMins = lesson?.duration_minutes || 60
        setNewBookingSlotsLoading(true)
        setNewBookingSlotsMessage(null)
        setNewBookingSlots([])
        fetch(`/api/admin/available-slots?instructorId=${instructorId}&date=${date}&durationMins=${durationMins}`)
            .then(r => r.json())
            .then(({ slots, message }) => {
                setNewBookingSlots(slots || [])
                setNewBookingSlotsMessage(message || (slots?.length === 0 ? 'No available slots on this day.' : null))
            })
            .catch(() => setNewBookingSlotsMessage('Failed to load available slots.'))
            .finally(() => setNewBookingSlotsLoading(false))
    }, [bookingData.instructorId, bookingData.date, bookingData.lessonId, lessons])

    const fetchAdminData = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/data')
            if (!res.ok) throw new Error('Failed to fetch admin data')
            const data = await res.json()

            const { allUsers, lessons, packagePurchases, inquiries, allBookings, settings } = data

            setAllUsers(allUsers)
            setLessons(lessons)
            setPackagePurchases(packagePurchases)
            setInquiries(inquiries)
            setAllBookings(allBookings)
            setInstructors(data.instructors || [])
            setVehicleHires(data.vehicleHires || [])

            setRecentUsers(
                [...allUsers]
                    .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .slice(0, 10)
                    .map((u: any) => ({
                        id: u.id,
                        name: u.full_name || 'Anonymous',
                        status: 'active',
                        joined: new Date(u.updated_at).toLocaleDateString(),
                    }))
            )

            const logoSetting = settings.find((s: any) => s.key === 'logo_url')
            if (logoSetting?.value) setLogoUrl(logoSetting.value)

            const packageRevenue = packagePurchases.reduce((acc: number, p: any) => acc + (p.amount || 0), 0)
            const singleLessonRevenue = allBookings
                .filter((b: any) => b.payment_status === 'paid')
                .reduce((acc: number, b: any) => acc + (b.lesson?.price || 0), 0)

            setStats({
                totalRevenue: packageRevenue + singleLessonRevenue,
                activeBookings: allBookings.filter((b: any) => b.status === 'scheduled').length,
                newStudents: allUsers.length,
                pendingInstructors: instructors.length,
            })
        } catch (e) {
            console.error('fetchAdminData error:', e)
        } finally {
            setLoading(false)
        }
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setIsUploadingLogo(true)
        try {
            const form = new FormData()
            form.append('file', file)
            const res = await fetch('/api/admin/logo', { method: 'POST', body: form })
            if (!res.ok) throw new Error((await res.json()).error)
            const { url } = await res.json()
            setLogoUrl(url)
            alert('Logo updated successfully!')
        } catch (err: any) {
            alert('Failed to upload logo: ' + err.message)
        } finally {
            setIsUploadingLogo(false)
        }
    }

const toggleLessonStatus = async (id: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/admin/lessons/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            fetchAdminData()
        } catch (err: any) {
            alert('Error updating lesson: ' + err.message)
        }
    }

    const openEditLesson = (lesson: any) => {
        setLessonEditForm({
            title: lesson.title || '',
            description: lesson.description || '',
            price: String(lesson.price ?? ''),
            duration_minutes: String(lesson.duration_minutes ?? ''),
            is_package: !!lesson.is_package,
            lesson_count: String(lesson.lesson_count ?? '1'),
            is_active: !!lesson.is_active,
        })
        setLessonEditError(null)
        setEditingLesson(lesson)
    }

    const handleSaveLesson = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingLesson) return

        const duration = parseInt(lessonEditForm.duration_minutes)
        const count = parseInt(lessonEditForm.lesson_count)

        if (lessonEditForm.is_package) {
            if (!count || count < 2) {
                setLessonEditError('Package must have at least 2 lessons.')
                return
            }
            if (duration % count !== 0) {
                setLessonEditError(`Total duration (${duration} mins) must divide evenly by lesson count (${count}). Each session would be ${(duration / count).toFixed(2)} mins — not a whole number.`)
                return
            }
        }

        setLessonEditLoading(true)
        setLessonEditError(null)
        try {
            const res = await fetch(`/api/admin/lessons/${editingLesson.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: lessonEditForm.title,
                    description: lessonEditForm.description,
                    price: parseFloat(lessonEditForm.price),
                    duration_minutes: duration,
                    is_package: lessonEditForm.is_package,
                    lesson_count: lessonEditForm.is_package ? count : 1,
                    is_active: lessonEditForm.is_active,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setEditingLesson(null)
            fetchAdminData()
        } catch (err: any) {
            setLessonEditError(err.message)
        } finally {
            setLessonEditLoading(false)
        }
    }

    const deleteUser = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return
        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error((await res.json()).error)
            fetchAdminData()
        } catch (err: any) {
            alert('Error deleting user: ' + err.message)
        }
    }

    const openEditUser = (u: any) => {
        setEditingUser(u)
        setUserForm({
            full_name: u.full_name || '',
            phone: u.phone || '',
            address: u.address || '',
        })
        setUserFormError(null)
    }

    const saveUserEdit = async () => {
        if (!editingUser) return
        setUserFormLoading(true)
        setUserFormError(null)
        try {
            const payload = {
                full_name: userForm.full_name,
                phone: userForm.phone,
                address: userForm.address,
            }
            const res = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            setEditingUser(null)
            fetchAdminData()
        } catch (err: any) {
            setUserFormError(err.message)
        } finally {
            setUserFormLoading(false)
        }
    }

    const deleteLesson = async (id: string) => {
        if (!confirm('Are you sure you want to delete this lesson? This cannot be undone.')) return
        try {
            const res = await fetch(`/api/admin/lessons/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error((await res.json()).error)
            fetchAdminData()
        } catch (err: any) {
            alert('Error deleting lesson: ' + err.message)
        }
    }

    const handleSaveHire = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const payload = {
                title: hireForm.title,
                description: hireForm.description || null,
                vehicle_type: hireForm.vehicle_type,
                duration_minutes: Number(hireForm.duration_minutes),
                price: Number(hireForm.price),
            }
            if (editingHire) {
                const res = await fetch(`/api/admin/hires/${editingHire.id}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
                })
                if (!res.ok) throw new Error((await res.json()).error)
                setEditingHire(null)
            } else {
                const res = await fetch('/api/admin/hires', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
                })
                if (!res.ok) throw new Error((await res.json()).error)
                setShowNewHireModal(false)
            }
            setHireForm({ title: '', description: '', vehicle_type: 'car', duration_minutes: '60', price: '' })
            fetchAdminData()
        } catch (err: any) {
            alert('Error saving hire option: ' + err.message)
        }
    }

    const deleteHire = async (id: string) => {
        if (!confirm('Delete this hire option? This cannot be undone.')) return
        try {
            const res = await fetch(`/api/admin/hires/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error((await res.json()).error)
            fetchAdminData()
        } catch (err: any) {
            alert('Error deleting hire option: ' + err.message)
        }
    }

    const deleteBooking = async (bookingId: string) => {
        if (!confirm('Are you sure you want to completely delete this booking?')) return
        try {
            const res = await fetch(`/api/admin/bookings/${bookingId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error((await res.json()).error)
            fetchAdminData()
        } catch (err: any) {
            alert('Error deleting booking: ' + err.message)
        }
    }

    const openEditBooking = (b: any) => {
        const start = new Date(b.start_time)
        // Extract date/time in Brisbane timezone (AEST = UTC+10, no DST in QLD)
        const dateStr = start.toLocaleDateString('en-CA', { timeZone: 'Australia/Brisbane' })
        const timeStr = start.toLocaleTimeString('en-AU', { timeZone: 'Australia/Brisbane', hour: '2-digit', minute: '2-digit', hour12: false })
        setBookingEditForm({
            instructorId: b.instructor_id || '',
            lessonId: b.lesson_id || '',
            date: dateStr,
            time: timeStr,
            status: b.status || 'scheduled',
            paymentStatus: b.payment_status || 'pending',
            pickupAddress: b.pickup_address || '',
            vehicleType: b.vehicle_type || 'car',
            transmissionType: b.transmission_type || 'auto',
        })
        setBookingEditError(null)
        setEditingBooking(b)
    }

    const handleSaveBookingEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingBooking) return
        setBookingEditLoading(true)
        setBookingEditError(null)
        try {
            const res = await fetch(`/api/admin/bookings/${editingBooking.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingEditForm),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setEditingBooking(null)
            fetchAdminData()
        } catch (err: any) {
            setBookingEditError(err.message)
        } finally {
            setBookingEditLoading(false)
        }
    }

const handleAddLesson = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const title = formData.get('title') as string
        const description = formData.get('description') as string
        const price = parseFloat(formData.get('price') as string)
        const duration_minutes = parseInt(formData.get('duration') as string)
        const is_package = formData.get('is_package') === 'on'
        const lesson_count = is_package ? parseInt(formData.get('lesson_count') as string) : 1

        // Client-side validation
        if (is_package) {
            if (!lesson_count || lesson_count < 2) {
                alert('Package must have at least 2 lessons.')
                return
            }
            if (duration_minutes % lesson_count !== 0) {
                alert(`Total duration (${duration_minutes} mins) must divide evenly by lesson count (${lesson_count}). Each session would be ${(duration_minutes / lesson_count).toFixed(2)} mins — not a whole number.`)
                return
            }
        }

        try {
            const res = await fetch('/api/admin/lessons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, price, duration_minutes, is_package, lesson_count }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            setShowNewLessonModal(false)
            fetchAdminData()
        } catch (err: any) {
            alert('Error adding lesson: ' + err.message)
        }
    }

    const handleManualBooking = async (e: React.FormEvent) => {
        e.preventDefault()
        setManualBookingError(null)
        setLoading(true)
        try {
            const res = await fetch('/api/admin/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...bookingData,
                    newStudent: manualBookingTab === 'new' ? newStudentForm : null,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setShowManualBookingModal(false)
            setBookingData({ studentId: '', instructorId: '', lessonId: '', date: '', time: '', transmission: 'auto', vehicleType: 'car' as 'car' | 'truck', pickupAddress: '', paymentMethod: 'pending' as 'paid' | 'pending' })
            setNewStudentForm({ full_name: '', email: '', phone: '', address: '', gender: '', license_number: '', license_expiry: '' })
            setManualBookingTab('existing')
            fetchAdminData()
        } catch (err: any) {
            setManualBookingError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateHireBooking = async (e: React.FormEvent) => {
        e.preventDefault()
        setHireBookingError(null)
        setHireBookingLoading(true)
        try {
            const res = await fetch('/api/admin/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...hireBookingData,
                    newStudent: hireBookingTab === 'new' ? hireBookingNewStudent : null,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setShowNewHireBookingModal(false)
            setHireBookingData({ studentId: '', hireId: '', date: '', time: '', pickupAddress: '', paymentMethod: 'pending' })
            setHireBookingNewStudent({ full_name: '', email: '', phone: '', address: '' })
            setHireBookingTab('existing')
            fetchAdminData()
        } catch (err: any) {
            setHireBookingError(err.message)
        } finally {
            setHireBookingLoading(false)
        }
    }

    const selectInstructor = async (instructor: any) => {
        setSelectedInstructor(instructor)
        setInstructorForm({
            full_name: instructor.full_name || '',
            email: instructor.email || '',
            bio: instructor.bio || '',
            experience_years: String(instructor.experience_years || ''),
            car_model: instructor.car_model || '',
            languages: (instructor.languages || ['English']).join(', '),
            phone: instructor.phone || '',
            rating: String(instructor.rating || '5'),
        })
        setAvailabilityLoading(true)
        try {
            const res = await fetch(`/api/admin/instructors/${instructor.id}/availability`)
            if (res.ok) setInstructorAvailability(await res.json())
        } finally {
            setAvailabilityLoading(false)
        }
    }

    const handleCreateInstructor = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const res = await fetch('/api/admin/instructors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: newInstructorForm.full_name,
                    email: newInstructorForm.email,
                    phone: newInstructorForm.phone,
                    bio: newInstructorForm.bio,
                    experience_years: parseInt(newInstructorForm.experience_years) || 0,
                    car_model: newInstructorForm.car_model,
                    languages: newInstructorForm.languages.split(',').map(l => l.trim()).filter(Boolean),
                    rating: parseFloat(newInstructorForm.rating) || 5,
                }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            setShowNewInstructorModal(false)
            setNewInstructorForm({ full_name: '', email: '', phone: '', bio: '', experience_years: '', car_model: '', languages: 'English', rating: '5' })
            fetchAdminData()
        } catch (err: any) {
            alert('Error creating instructor: ' + err.message)
        }
    }

    const handleSaveInstructor = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedInstructor) return
        try {
            const res = await fetch(`/api/admin/instructors/${selectedInstructor.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: instructorForm.full_name,
                    email: instructorForm.email || '',
                    phone: instructorForm.phone,
                    bio: instructorForm.bio,
                    experience_years: parseInt(instructorForm.experience_years) || 0,
                    car_model: instructorForm.car_model,
                    languages: instructorForm.languages.split(',').map(l => l.trim()).filter(Boolean),
                    rating: parseFloat(instructorForm.rating) || 5,
                }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            fetchAdminData()
            alert('Instructor updated successfully!')
        } catch (err: any) {
            alert('Error saving instructor: ' + err.message)
        }
    }

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedInstructor || !e.target.files?.[0]) return
        const file = e.target.files[0]
        setPhotoUploading(true)
        try {
            const fd = new FormData()
            fd.append('photo', file)
            const res = await fetch(`/api/admin/instructors/${selectedInstructor.id}/photo`, { method: 'POST', body: fd })
            if (!res.ok) throw new Error((await res.json()).error)
            const { photo_url } = await res.json()
            setSelectedInstructor((prev: any) => ({ ...prev, photo_url }))
            setInstructors((prev: any[]) => prev.map(i => i.id === selectedInstructor.id ? { ...i, photo_url } : i))
        } catch (err: any) {
            alert('Error uploading photo: ' + err.message)
        } finally {
            setPhotoUploading(false)
        }
    }

    const handleBulkAvailability = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedInstructor) return
        const { startMonth, endMonth, start_time, end_time } = bulkAvailForm
        const label = startMonth === endMonth ? startMonth : `${startMonth} – ${endMonth}`
        if (!confirm(`Set availability ${start_time}–${end_time} for every day in ${label} for ${selectedInstructor.full_name}? Existing slots in this range will be replaced.`)) return
        setBulkAvailLoading(true)
        try {
            const res = await fetch(`/api/admin/instructors/${selectedInstructor.id}/availability/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startMonth, endMonth, start_time, end_time }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            const updated = await fetch(`/api/admin/instructors/${selectedInstructor.id}/availability`)
            if (updated.ok) setInstructorAvailability(await updated.json())
            alert(`Availability set for ${label} (${start_time}–${end_time})`)
        } catch (err: any) {
            alert('Error setting availability: ' + err.message)
        } finally {
            setBulkAvailLoading(false)
        }
    }

    const handleDeleteInstructor = async (id: string) => {
        if (!confirm('Delete this instructor? Their availability slots will also be removed.')) return
        try {
            const res = await fetch(`/api/admin/instructors/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error((await res.json()).error)
            setSelectedInstructor(null)
            fetchAdminData()
        } catch (err: any) {
            alert('Error deleting instructor: ' + err.message)
        }
    }

    const handleAddSlot = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedInstructor) return
        try {
            const res = await fetch(`/api/admin/instructors/${selectedInstructor.id}/availability`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    day_of_week: parseInt(newSlot.day_of_week),
                    start_time: newSlot.start_time,
                    end_time: newSlot.end_time,
                }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            setNewSlot({ day_of_week: '1', start_time: '09:00', end_time: '17:00' })
            const updated = await fetch(`/api/admin/instructors/${selectedInstructor.id}/availability`)
            if (updated.ok) setInstructorAvailability(await updated.json())
        } catch (err: any) {
            alert('Error adding slot: ' + err.message)
        }
    }

    const handleAddSlotForDay = async (dayIndex: number) => {
        if (!selectedInstructor) return
        try {
            const res = await fetch(`/api/admin/instructors/${selectedInstructor.id}/availability`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    day_of_week: dayIndex,
                    start_time: daySlotForm.start_time,
                    end_time: daySlotForm.end_time,
                }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            const updated = await fetch(`/api/admin/instructors/${selectedInstructor.id}/availability`)
            if (updated.ok) setInstructorAvailability(await updated.json())
            setAddingSlotDay(null)
            setDaySlotForm({ start_time: '09:00', end_time: '17:00' })
        } catch (err: any) {
            alert('Error adding slot: ' + err.message)
        }
    }

    const toMins = (t: string) => { const [h, m] = t.slice(0, 5).split(':').map(Number); return h * 60 + m }

    const hasOverlap = (specificDate: string, startTime: string, endTime: string, type: string, excludeId?: string) => {
        return instructorAvailability
            .filter(s => s.specific_date === specificDate && s.type === type && s.id !== excludeId)
            .some(s => toMins(startTime) < toMins(s.end_time) && toMins(endTime) > toMins(s.start_time))
    }

    const handleCalendarSelect = async (info: any) => {
        if (!selectedInstructor) return
        const specificDate = info.start.toLocaleDateString('en-CA', { timeZone: 'Australia/Brisbane' })
        const startTime = info.start.toTimeString().slice(0, 5)
        const endTime = info.end.toTimeString().slice(0, 5)

        if (startTime >= endTime) {
            alert('End time must be after start time.')
            return
        }
        if (hasOverlap(specificDate, startTime, endTime, 'available')) {
            alert(`An available slot already exists for this time on ${specificDate}.`)
            return
        }
        try {
            const res = await fetch(`/api/admin/instructors/${selectedInstructor.id}/availability`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ specific_date: specificDate, start_time: startTime, end_time: endTime, type: 'available' }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            const updated = await fetch(`/api/admin/instructors/${selectedInstructor.id}/availability`)
            if (updated.ok) setInstructorAvailability(await updated.json())
        } catch (err: any) {
            alert('Error adding slot: ' + err.message)
        }
    }

    const handleAddBlockedSlot = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedInstructor) return
        const { date, start_time, end_time } = blockedSlotForm
        if (!date || !start_time || !end_time) { alert('Please fill in date, start and end time.'); return }
        if (start_time >= end_time) { alert('End time must be after start time.'); return }
        try {
            const res = await fetch(`/api/admin/instructors/${selectedInstructor.id}/availability`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ specific_date: date, start_time, end_time, type: 'blocked' }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            const updated = await fetch(`/api/admin/instructors/${selectedInstructor.id}/availability`)
            if (updated.ok) setInstructorAvailability(await updated.json())
        } catch (err: any) {
            alert('Error adding block: ' + err.message)
        }
    }

    const handleDeleteSlot = async (slotId: string) => {
        if (!selectedInstructor) return
        try {
            const res = await fetch(`/api/admin/instructors/${selectedInstructor.id}/availability/${slotId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error((await res.json()).error)
            setInstructorAvailability(prev => prev.filter(s => s.id !== slotId))
        } catch (err: any) {
            alert('Error deleting slot: ' + err.message)
        }
    }

    const handleToggleSlot = async (slotId: string, current: boolean) => {
        if (!selectedInstructor) return
        try {
            const res = await fetch(`/api/admin/instructors/${selectedInstructor.id}/availability/${slotId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !current }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            setInstructorAvailability(prev => prev.map(s => s.id === slotId ? { ...s, is_active: !current } : s))
        } catch (err: any) {
            alert('Error updating slot: ' + err.message)
        }
    }

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    const NAV_ITEMS = [
        { key: 'overview',      label: 'Overview',      icon: LayoutDashboard },
        { key: 'analytics',     label: 'Analytics',     icon: TrendingUp },
        { key: 'lessons',       label: 'Lessons',       icon: Clock },
        { key: 'hires',         label: 'Vehicle Hire',  icon: Car },
        { key: 'users',         label: 'Students',      icon: Users },
        { key: 'bookings',      label: 'Bookings',      icon: Calendar },
        { key: 'hire-bookings', label: 'Hire Bookings', icon: Car },
        { key: 'payments',      label: 'Payments',      icon: DollarSign },
        { key: 'instructors',   label: 'Instructors',   icon: UserCheck },
        { key: 'reports',       label: 'Reports',       icon: TrendingUp },
        { key: 'settings',      label: 'Settings',      icon: Settings },
    ] as const

    return (
        <div className="min-h-screen flex bg-muted/30">
            {/* ── Calendar booking tooltip (fixed overlay, escapes all stacking contexts) ── */}
            {calendarTooltip && (
                <div
                    className="pointer-events-none fixed z-[99999] w-60"
                    style={{ left: calendarTooltip.x, top: calendarTooltip.y }}
                >
                    <div className="bg-gray-900 text-white text-xs rounded-lg shadow-2xl p-3 space-y-1.5 border border-white/10">
                        <div className="font-bold text-sm border-b border-white/20 pb-1.5">{calendarTooltip.props.student}</div>
                        {calendarTooltip.props.timeRange && (
                            <div className="flex gap-2">
                                <span className="text-white/60 shrink-0 w-14">Time</span>
                                <span className="font-medium">{calendarTooltip.props.timeRange}</span>
                            </div>
                        )}
                        {calendarTooltip.props.lesson && (
                            <div className="flex gap-2">
                                <span className="text-white/60 shrink-0 w-14">Lesson</span>
                                <span className="font-medium">{calendarTooltip.props.lesson}</span>
                            </div>
                        )}
                        {(() => {
                            const p = calendarTooltip.props
                            const vehicleLabel = p.vehicleType
                                ? `${p.vehicleType.charAt(0).toUpperCase() + p.vehicleType.slice(1)}${p.transmissionType ? ` · ${p.transmissionType.charAt(0).toUpperCase() + p.transmissionType.slice(1)}` : ''}`
                                : null
                            return vehicleLabel ? (
                                <div className="flex gap-2">
                                    <span className="text-white/60 shrink-0 w-14">Vehicle</span>
                                    <span className="font-medium">{vehicleLabel}</span>
                                </div>
                            ) : null
                        })()}
                        {calendarTooltip.props.pickupAddress && (
                            <div className="flex gap-2">
                                <span className="text-white/60 shrink-0 w-14">Pickup</span>
                                <span className="font-medium break-words">{calendarTooltip.props.pickupAddress}</span>
                            </div>
                        )}
                        {calendarTooltip.props.studentPhone && (
                            <div className="flex gap-2">
                                <span className="text-white/60 shrink-0 w-14">Phone</span>
                                <span className="font-medium">{calendarTooltip.props.studentPhone}</span>
                            </div>
                        )}
                        <div className="flex gap-2 pt-0.5 border-t border-white/20">
                            <span className="text-white/60 shrink-0 w-14">Payment</span>
                            <span className={`font-semibold ${calendarTooltip.props.payment === 'paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                                {calendarTooltip.props.payment === 'paid' ? '✓ Paid' : '⏳ Pending'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Sidebar ─────────────────────────────────────────────── */}
            <aside className="w-56 shrink-0 bg-card border-r border-border flex flex-col h-screen sticky top-0">
                {/* Logo */}
                <div className="p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary p-2 rounded-xl text-white">
                            <LayoutDashboard className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold font-outfit text-sm leading-tight">Admin Panel</p>
                            <p className="text-[11px] text-muted-foreground">Bayside Driving</p>
                        </div>
                    </div>
                </div>

                {/* Nav items */}
                <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.key}
                            onClick={() => { setActiveTab(item.key as any); if (item.key === 'instructors') setSelectedInstructor(null) }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                                activeTab === item.key
                                    ? 'bg-accent text-white shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            <item.icon className="w-4 h-4 shrink-0" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* Logout */}
                <div className="p-3 border-t border-border">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all"
                    >
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </aside>

            {/* ── Main content ─────────────────────────────────────────── */}
            <main className="flex-1 min-w-0 p-8 space-y-8 overflow-y-auto">

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Revenue', value: `$${stats.totalRevenue}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100', trend: '' },
                    { label: 'Active Bookings', value: stats.activeBookings, icon: Calendar, color: 'text-accent', bg: 'bg-accent/10', trend: '' },
                    { label: 'Total Students', value: stats.newStudents, icon: Users, color: 'text-secondary', bg: 'bg-secondary/20', trend: '' },
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
                        </div>
                        <div>
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                            <p className="text-3xl font-bold">{stat.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div>
                {/* Main Content Area based on activeTab */}
                <div className="space-y-6">
                    {activeTab === 'overview' && (
                        <>
                            <h2 className="text-2xl font-bold font-outfit">Recent Bookings</h2>
                            <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-muted/50 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                            <th className="px-6 py-5">Student</th>
                                            <th className="px-6 py-5">Date & Time</th>
                                            <th className="px-6 py-5">Status</th>
                                            <th className="px-6 py-5">Payment</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {allBookings.slice(0, 10).map((b: any) => {
                                            const student = allUsers.find((u: any) => u.id === b.student_id)
                                            return (
                                                <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-6 py-4 text-sm font-medium">{student?.full_name || 'Unknown'}</td>
                                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                                        {new Date(b.start_time).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${b.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : b.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {b.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${b.payment_status === 'paid' ? 'bg-green-100 text-green-700' : b.payment_status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                            {b.payment_status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        {allBookings.length === 0 && (
                                            <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-muted-foreground">No bookings yet.</td></tr>
                                        )}
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
                                        <input name="price" type="number" step="0.01" placeholder="Price ($)" required className="bg-background border border-border p-2 rounded-lg" />
                                        <input name="duration" type="number" placeholder="Total Duration (mins)" required className="bg-background border border-border p-2 rounded-lg" />
                                        <textarea name="description" placeholder="Description (optional)" rows={2} className="md:col-span-3 bg-background border border-border p-2 rounded-lg resize-none" />

                                        {/* Package bundle toggle */}
                                        <div className="md:col-span-3 flex items-center gap-3 p-4 bg-background border border-border rounded-xl">
                                            <input
                                                id="is_package"
                                                name="is_package"
                                                type="checkbox"
                                                checked={newLessonIsPackage}
                                                onChange={e => setNewLessonIsPackage(e.target.checked)}
                                                className="w-4 h-4 accent-accent cursor-pointer"
                                            />
                                            <label htmlFor="is_package" className="text-sm font-bold cursor-pointer select-none">
                                                This is a package bundle (multiple lessons)
                                            </label>
                                        </div>

                                        {newLessonIsPackage && (
                                            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-accent/5 border border-accent/20 rounded-xl">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Number of Lessons in Package</label>
                                                    <input
                                                        name="lesson_count"
                                                        type="number"
                                                        min="2"
                                                        placeholder="e.g. 5"
                                                        required={newLessonIsPackage}
                                                        className="w-full bg-background border border-border p-2 rounded-lg"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Validation rule</label>
                                                    <p className="text-xs text-muted-foreground pt-2">
                                                        Total duration ÷ lesson count must be a whole number.<br />
                                                        e.g. 300 mins ÷ 5 lessons = 60 mins per session ✓
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="md:col-span-3 flex justify-end gap-2">
                                            <Button type="button" variant="ghost" onClick={() => { setShowNewLessonModal(false); setNewLessonIsPackage(false) }}>Cancel</Button>
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
                                            <th className="px-6 py-5">Type</th>
                                            <th className="px-6 py-5">Price</th>
                                            <th className="px-6 py-5">Duration</th>
                                            <th className="px-6 py-5">Status</th>
                                            <th className="px-6 py-5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {lessons.map(lesson => (
                                            <tr key={lesson.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium">
                                                    {lesson.title}
                                                    {lesson.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{lesson.description}</p>}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    {lesson.is_package ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent text-[10px] font-bold rounded-full uppercase tracking-wide">
                                                            Bundle · {lesson.lesson_count} lessons
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Single</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold">${lesson.price}</td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground">
                                                    {lesson.duration_minutes}m
                                                    {lesson.is_package && <span className="text-xs text-muted-foreground/70 block">{lesson.duration_minutes / lesson.lesson_count}m/session</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => toggleLessonStatus(lesson.id, lesson.is_active)}
                                                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${lesson.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                                    >
                                                        {lesson.is_active ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" className="text-accent" onClick={() => openEditLesson(lesson)}>Edit</Button>
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
                    {activeTab === 'hires' && (
                        <>
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold font-outfit">Vehicle Hire for Test</h2>
                                <Button size="sm" className="rounded-xl gap-2" onClick={() => { setEditingHire(null); setHireForm({ title: '', description: '', vehicle_type: 'car', duration_minutes: '60', price: '' }); setShowNewHireModal(true) }}>
                                    <Plus className="w-4 h-4" /> New Hire Option
                                </Button>
                            </div>

                            {(showNewHireModal || editingHire) && (
                                <div className="bg-muted/30 p-6 rounded-2xl border border-border space-y-4">
                                    <h3 className="font-bold">{editingHire ? 'Edit Hire Option' : 'Add New Hire Option'}</h3>
                                    <form onSubmit={handleSaveHire} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <input
                                            placeholder="Title (e.g. Car Hire for Test)"
                                            required
                                            value={hireForm.title}
                                            onChange={e => setHireForm(f => ({ ...f, title: e.target.value }))}
                                            className="bg-background border border-border p-2 rounded-lg"
                                        />
                                        <input
                                            type="number" step="0.01" placeholder="Price ($)"
                                            required
                                            value={hireForm.price}
                                            onChange={e => setHireForm(f => ({ ...f, price: e.target.value }))}
                                            className="bg-background border border-border p-2 rounded-lg"
                                        />
                                        <input
                                            type="number" placeholder="Duration (mins)"
                                            required
                                            value={hireForm.duration_minutes}
                                            onChange={e => setHireForm(f => ({ ...f, duration_minutes: e.target.value }))}
                                            className="bg-background border border-border p-2 rounded-lg"
                                        />
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vehicle Type</label>
                                            <select
                                                value={hireForm.vehicle_type}
                                                onChange={e => setHireForm(f => ({ ...f, vehicle_type: e.target.value }))}
                                                className="w-full bg-background border border-border p-2 rounded-lg"
                                            >
                                                <option value="car">Car</option>
                                                <option value="truck">Truck</option>
                                            </select>
                                        </div>
                                        <textarea
                                            placeholder="Description (optional)"
                                            rows={2}
                                            value={hireForm.description}
                                            onChange={e => setHireForm(f => ({ ...f, description: e.target.value }))}
                                            className="md:col-span-2 bg-background border border-border p-2 rounded-lg resize-none"
                                        />
                                        <div className="md:col-span-3 flex justify-end gap-2">
                                            <Button type="button" variant="ghost" onClick={() => { setShowNewHireModal(false); setEditingHire(null) }}>Cancel</Button>
                                            <Button type="submit">{editingHire ? 'Save Changes' : 'Add Hire Option'}</Button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-muted/50 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                            <th className="px-6 py-5">Title</th>
                                            <th className="px-6 py-5">Vehicle</th>
                                            <th className="px-6 py-5">Price</th>
                                            <th className="px-6 py-5">Duration</th>
                                            <th className="px-6 py-5">Status</th>
                                            <th className="px-6 py-5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {vehicleHires.length === 0 && (
                                            <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">No hire options yet. Add one above.</td></tr>
                                        )}
                                        {vehicleHires.map((hire: any) => (
                                            <tr key={hire.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium">
                                                    {hire.title}
                                                    {hire.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{hire.description}</p>}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-full uppercase tracking-wide ${hire.vehicle_type === 'truck' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {hire.vehicle_type === 'truck' ? '🚛 Truck' : '🚗 Car'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold">${hire.price}</td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground">{hire.duration_minutes}m</td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={async () => {
                                                            await fetch(`/api/admin/hires/${hire.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !hire.is_active }) })
                                                            fetchAdminData()
                                                        }}
                                                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${hire.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                                    >
                                                        {hire.is_active ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" className="text-accent" onClick={() => { setEditingHire(hire); setHireForm({ title: hire.title, description: hire.description || '', vehicle_type: hire.vehicle_type, duration_minutes: String(hire.duration_minutes), price: String(hire.price) }); setShowNewHireModal(false) }}>Edit</Button>
                                                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteHire(hire.id)}>Delete</Button>
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
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <Button variant="ghost" size="sm" className="text-accent underline" onClick={() => openEditUser(u)}>Edit</Button>
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
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={showPastBookings}
                                            onChange={e => setShowPastBookings(e.target.checked)}
                                            className="rounded"
                                        />
                                        Show past bookings
                                    </label>
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
                                            <th className="px-6 py-5">Booked On</th>
                                            <th className="px-6 py-5">Status</th>
                                            <th className="px-6 py-5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {(() => {
                                            const now = new Date()
                                            return allBookings
                                                .filter((b: any) => !b.hire_id)
                                                .filter((b: any) => showPastBookings || new Date(b.start_time) >= now)
                                                .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                                        })().map(b => {
                                            const student = allUsers.find((u: any) => u.id === b.student_id);
                                            const instructor = instructors.find((inst: any) => inst.id === b.instructor_id);
                                            const lesson = lessons.find((l: any) => l.id === b.lesson_id);
                                            // Count siblings in same bundle
                                            const bundleSiblings = b.bundle_id
                                                ? allBookings.filter((x: any) => x.bundle_id === b.bundle_id)
                                                : []
                                            const bundleIndex = b.bundle_id
                                                ? bundleSiblings.sort((a: any, x: any) => new Date(a.start_time).getTime() - new Date(x.start_time).getTime()).findIndex((x: any) => x.id === b.id) + 1
                                                : 0
                                            const shortBundleId = b.bundle_id ? b.bundle_id.slice(0, 6).toUpperCase() : null
                                            return (
                                            <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-medium text-sm">{student?.full_name || 'Unknown'}</p>
                                                    <p className="text-xs text-muted-foreground">{student?.email || 'No email'}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm">{instructor?.full_name || 'Unknown'}</td>
                                                <td className="px-6 py-4 text-sm font-medium">
                                                    {lesson?.title || 'Custom'}
                                                    {b.bundle_id && (
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full uppercase tracking-wide">
                                                                Bundle #{shortBundleId} · {bundleIndex}/{bundleSiblings.length}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm">{new Date(b.start_time).toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(b.start_time).toLocaleTimeString('en-AU', { timeZone: 'Australia/Brisbane', hour: '2-digit', minute: '2-digit' })} – {new Date(b.end_time).toLocaleTimeString('en-AU', { timeZone: 'Australia/Brisbane', hour: '2-digit', minute: '2-digit' })}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {b.created_at ? (
                                                        <>
                                                            <p className="text-sm">{new Date(b.created_at).toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                            <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleTimeString('en-AU', { timeZone: 'Australia/Brisbane', hour: '2-digit', minute: '2-digit' })}</p>
                                                        </>
                                                    ) : <span className="text-xs text-muted-foreground">—</span>}
                                                </td>
                                                <td className="px-6 py-4 space-y-1">
                                                    <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase ${b.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                                            b.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                'bg-red-100 text-red-700'
                                                        }`}>
                                                        {b.status}
                                                    </span>
                                                    <span className={`inline-block ml-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                        b.payment_status === 'paid' ? 'bg-green-100 text-green-700' :

                                                        'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {b.payment_status || 'pending'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="sm" className="text-accent" onClick={() => openEditBooking(b)}>Edit</Button>
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


                    {activeTab === 'hire-bookings' && (
                        <>
                            <div className="flex justify-between items-center text-sm">
                                <div>
                                    <h2 className="text-2xl font-bold font-outfit">Vehicle Hire Bookings</h2>
                                    <p className="text-muted-foreground text-sm mt-1">Bookings where a student has hired a vehicle for their test.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={showPastHireBookings}
                                            onChange={e => setShowPastHireBookings(e.target.checked)}
                                            className="rounded"
                                        />
                                        Show past bookings
                                    </label>
                                    <Button size="sm" variant="outline" className="rounded-xl gap-2" onClick={() => fetchAdminData()}>
                                        Refresh
                                    </Button>
                                    <Button size="sm" className="rounded-xl gap-2" onClick={() => { setHireBookingError(null); setShowNewHireBookingModal(true) }}>
                                        <Plus className="w-4 h-4" /> New Hire Booking
                                    </Button>
                                </div>
                            </div>

                            {showNewHireBookingModal && (
                                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                                    <div className="bg-card border border-border rounded-[2.5rem] shadow-2xl w-full max-w-xl p-8 space-y-6 overflow-y-auto max-h-[90vh]">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-xl font-bold font-outfit">New Vehicle Hire Booking</h3>
                                            <button onClick={() => setShowNewHireBookingModal(false)} className="text-muted-foreground hover:text-foreground text-2xl leading-none">✕</button>
                                        </div>

                                        {hireBookingError && (
                                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                <p>{hireBookingError}</p>
                                            </div>
                                        )}

                                        {/* Student tab toggle */}
                                        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit text-sm">
                                            <button onClick={() => setHireBookingTab('existing')} className={`px-4 py-1.5 rounded-lg font-bold transition-all ${hireBookingTab === 'existing' ? 'bg-white shadow text-accent' : 'text-muted-foreground'}`}>Existing Student</button>
                                            <button onClick={() => setHireBookingTab('new')} className={`px-4 py-1.5 rounded-lg font-bold transition-all ${hireBookingTab === 'new' ? 'bg-white shadow text-accent' : 'text-muted-foreground'}`}>New Student</button>
                                        </div>

                                        <form onSubmit={handleCreateHireBooking} className="space-y-4">
                                            {hireBookingTab === 'existing' ? (
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Student *</label>
                                                    <select
                                                        required
                                                        value={hireBookingData.studentId}
                                                        onChange={e => setHireBookingData(d => ({ ...d, studentId: e.target.value }))}
                                                        className="w-full bg-muted border border-border p-2 rounded-lg text-sm"
                                                    >
                                                        <option value="">Select a student…</option>
                                                        {allUsers.map((u: any) => (
                                                            <option key={u.id} value={u.id}>{u.full_name} {u.email ? `(${u.email})` : ''}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                                                    <div className="space-y-1 col-span-2">
                                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name *</label>
                                                        <input required value={hireBookingNewStudent.full_name} onChange={e => setHireBookingNewStudent(s => ({ ...s, full_name: e.target.value }))} placeholder="Jane Smith" className="w-full bg-background border border-border p-2 rounded-lg text-sm" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
                                                        <input type="email" value={hireBookingNewStudent.email} onChange={e => setHireBookingNewStudent(s => ({ ...s, email: e.target.value }))} placeholder="jane@example.com" className="w-full bg-background border border-border p-2 rounded-lg text-sm" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</label>
                                                        <input value={hireBookingNewStudent.phone} onChange={e => setHireBookingNewStudent(s => ({ ...s, phone: e.target.value }))} placeholder="04xx xxx xxx" className="w-full bg-background border border-border p-2 rounded-lg text-sm" />
                                                    </div>
                                                    <div className="space-y-1 col-span-2">
                                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Address</label>
                                                        <input value={hireBookingNewStudent.address} onChange={e => setHireBookingNewStudent(s => ({ ...s, address: e.target.value }))} placeholder="123 Main St, Brisbane" className="w-full bg-background border border-border p-2 rounded-lg text-sm" />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vehicle Hire Option *</label>
                                                <select
                                                    required
                                                    value={hireBookingData.hireId}
                                                    onChange={e => setHireBookingData(d => ({ ...d, hireId: e.target.value }))}
                                                    className="w-full bg-muted border border-border p-2 rounded-lg text-sm"
                                                >
                                                    <option value="">Select vehicle hire…</option>
                                                    {vehicleHires.filter((h: any) => h.is_active).map((h: any) => (
                                                        <option key={h.id} value={h.id}>{h.vehicle_type === 'truck' ? '🚛' : '🚗'} {h.title} — ${h.price} · {h.duration_minutes}min</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date *</label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={hireBookingData.date}
                                                        onChange={e => setHireBookingData(d => ({ ...d, date: e.target.value }))}
                                                        className="w-full bg-muted border border-border p-2 rounded-lg text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Time *</label>
                                                    <input
                                                        type="time"
                                                        required
                                                        value={hireBookingData.time}
                                                        onChange={e => setHireBookingData(d => ({ ...d, time: e.target.value }))}
                                                        className="w-full bg-muted border border-border p-2 rounded-lg text-sm"
                                                    />
                                                </div>
                                            </div>

                                            {/* Existing bookings for this vehicle on selected date */}
                                            {hireBookingData.hireId && hireBookingData.date && (() => {
                                                const dayBookings = allBookings.filter((b: any) =>
                                                    b.hire_id === hireBookingData.hireId &&
                                                    b.status === 'scheduled' &&
                                                    new Date(b.start_time).toLocaleDateString('en-CA', { timeZone: 'Australia/Brisbane' }) === hireBookingData.date
                                                )
                                                if (!dayBookings.length) return null
                                                return (
                                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                                                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Already booked on this date</p>
                                                        {dayBookings.map((b: any) => (
                                                            <p key={b.id} className="text-xs text-amber-800">
                                                                {new Date(b.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Brisbane' })}
                                                                {' – '}
                                                                {new Date(b.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Brisbane' })}
                                                                {' · '}
                                                                {allUsers.find((u: any) => u.id === b.student_id)?.full_name || 'Unknown student'}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )
                                            })()}

                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pickup Address</label>
                                                <input
                                                    value={hireBookingData.pickupAddress}
                                                    onChange={e => setHireBookingData(d => ({ ...d, pickupAddress: e.target.value }))}
                                                    placeholder="123 Main St, Brisbane"
                                                    className="w-full bg-muted border border-border p-2 rounded-lg text-sm"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Status</label>
                                                <select
                                                    value={hireBookingData.paymentMethod}
                                                    onChange={e => setHireBookingData(d => ({ ...d, paymentMethod: e.target.value as 'paid' | 'pending' }))}
                                                    className="w-full bg-muted border border-border p-2 rounded-lg text-sm"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="paid">Paid</option>
                                                </select>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-2">
                                                <Button type="button" variant="ghost" onClick={() => setShowNewHireBookingModal(false)}>Cancel</Button>
                                                <Button type="submit" isLoading={hireBookingLoading}>Create Hire Booking</Button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-muted/50 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                            <th className="px-6 py-5">Student</th>
                                            <th className="px-6 py-5">Vehicle Option</th>
                                            <th className="px-6 py-5">Date & Time</th>
                                            <th className="px-6 py-5">Booked On</th>
                                            <th className="px-6 py-5">Pickup Address</th>
                                            <th className="px-6 py-5">Status</th>
                                            <th className="px-6 py-5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {(() => {
                                            const now = new Date()
                                            return allBookings
                                                .filter((b: any) => b.hire_id)
                                                .filter((b: any) => showPastHireBookings || new Date(b.start_time) >= now)
                                                .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                                        })().length === 0 && (
                                            <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                                                {showPastHireBookings ? 'No vehicle hire bookings yet.' : 'No upcoming hire bookings.'}
                                            </td></tr>
                                        )}
                                        {(() => {
                                            const now = new Date()
                                            return allBookings
                                                .filter((b: any) => b.hire_id)
                                                .filter((b: any) => showPastHireBookings || new Date(b.start_time) >= now)
                                                .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                                        })().map((b: any) => {
                                            const student = allUsers.find((u: any) => u.id === b.student_id)
                                            const hire = vehicleHires.find((h: any) => h.id === b.hire_id)
                                            return (
                                                <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="font-medium text-sm">{student?.full_name || 'Unknown'}</p>
                                                        <p className="text-xs text-muted-foreground">{student?.email || 'No email'}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">
                                                        {hire ? (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-full uppercase tracking-wide ${hire.vehicle_type === 'truck' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {hire.vehicle_type === 'truck' ? '🚛' : '🚗'} {hire.title}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">Unknown</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm">{new Date(b.start_time).toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                        <p className="text-xs text-muted-foreground">{new Date(b.start_time).toLocaleTimeString('en-AU', { timeZone: 'Australia/Brisbane', hour: '2-digit', minute: '2-digit' })} – {new Date(b.end_time).toLocaleTimeString('en-AU', { timeZone: 'Australia/Brisbane', hour: '2-digit', minute: '2-digit' })}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {b.created_at ? (
                                                            <>
                                                                <p className="text-sm">{new Date(b.created_at).toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                                <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleTimeString('en-AU', { timeZone: 'Australia/Brisbane', hour: '2-digit', minute: '2-digit' })}</p>
                                                            </>
                                                        ) : <span className="text-xs text-muted-foreground">—</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                                                        {b.pickup_address || '—'}
                                                    </td>
                                                    <td className="px-6 py-4 space-y-1">
                                                        <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase ${b.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : b.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {b.status}
                                                        </span>
                                                        <span className={`inline-block ml-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${b.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            {b.payment_status || 'pending'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                        <Button variant="ghost" size="sm" className="text-accent" onClick={() => openEditBooking(b)}>Edit</Button>
                                                        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => deleteBooking(b.id)}>Delete</Button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
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

                    {activeTab === 'instructors' && (
                        <div className="space-y-6">
                            {!selectedInstructor ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-2xl font-bold font-outfit">Instructors</h2>
                                        <Button size="sm" className="rounded-xl gap-2" onClick={() => setShowNewInstructorModal(true)}>
                                            <Plus className="w-4 h-4" /> New Instructor
                                        </Button>
                                    </div>

                                    {showNewInstructorModal && (
                                        <div className="bg-muted/30 p-6 rounded-2xl border border-border space-y-4">
                                            <h3 className="font-bold">Add New Instructor</h3>
                                            <form onSubmit={handleCreateInstructor} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name *</label>
                                                    <input required value={newInstructorForm.full_name} onChange={e => setNewInstructorForm(f => ({ ...f, full_name: e.target.value }))}
                                                        placeholder="e.g. John Smith" className="w-full bg-background border border-border p-2 rounded-lg" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
                                                    <input type="email" value={newInstructorForm.email} onChange={e => setNewInstructorForm(f => ({ ...f, email: e.target.value }))}
                                                        placeholder="john@example.com" className="w-full bg-background border border-border p-2 rounded-lg" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</label>
                                                    <input value={newInstructorForm.phone} onChange={e => setNewInstructorForm(f => ({ ...f, phone: e.target.value }))}
                                                        placeholder="04xx xxx xxx" className="w-full bg-background border border-border p-2 rounded-lg" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Experience (years)</label>
                                                    <input type="number" min="0" value={newInstructorForm.experience_years} onChange={e => setNewInstructorForm(f => ({ ...f, experience_years: e.target.value }))}
                                                        placeholder="5" className="w-full bg-background border border-border p-2 rounded-lg" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Car Model</label>
                                                    <input value={newInstructorForm.car_model} onChange={e => setNewInstructorForm(f => ({ ...f, car_model: e.target.value }))}
                                                        placeholder="Toyota Corolla" className="w-full bg-background border border-border p-2 rounded-lg" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Languages (comma-separated)</label>
                                                    <input value={newInstructorForm.languages} onChange={e => setNewInstructorForm(f => ({ ...f, languages: e.target.value }))}
                                                        placeholder="English, Mandarin" className="w-full bg-background border border-border p-2 rounded-lg" />
                                                </div>
                                                <div className="md:col-span-2 space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bio</label>
                                                    <textarea rows={2} value={newInstructorForm.bio} onChange={e => setNewInstructorForm(f => ({ ...f, bio: e.target.value }))}
                                                        placeholder="Brief instructor bio..." className="w-full bg-background border border-border p-2 rounded-lg resize-none" />
                                                </div>
                                                <div className="md:col-span-2 flex justify-end gap-2">
                                                    <Button type="button" variant="ghost" onClick={() => setShowNewInstructorModal(false)}>Cancel</Button>
                                                    <Button type="submit">Create Instructor</Button>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-muted/50 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                                    <th className="px-6 py-5">Name</th>
                                                    <th className="px-6 py-5">Phone</th>
                                                    <th className="px-6 py-5">Experience</th>
                                                    <th className="px-6 py-5">Car</th>
                                                    <th className="px-6 py-5">Rating</th>
                                                    <th className="px-6 py-5 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/50">
                                                {instructors.map((inst: any) => (
                                                    <tr key={inst.id} className="hover:bg-muted/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <p className="font-medium text-sm">{inst.full_name}</p>
                                                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{inst.email || inst.bio || '—'}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">{inst.phone || '—'}</td>
                                                        <td className="px-6 py-4 text-sm">{inst.experience_years ? `${inst.experience_years} yrs` : '—'}</td>
                                                        <td className="px-6 py-4 text-sm">{inst.car_model || '—'}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="flex items-center gap-1 text-sm font-bold text-amber-500">
                                                                <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" />
                                                                {inst.rating ?? '5.0'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                            <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => selectInstructor(inst)}>
                                                                <Edit2 className="w-3.5 h-3.5" /> Manage
                                                            </Button>
                                                            <Button size="sm" variant="ghost" className="text-red-500 rounded-xl" onClick={() => handleDeleteInstructor(inst.id)}>
                                                                Delete
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {instructors.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-12 text-center text-muted-foreground italic">No instructors yet. Click &quot;New Instructor&quot; to add one.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setSelectedInstructor(null)}>
                                                ← Back
                                            </Button>
                                            <h2 className="text-2xl font-bold font-outfit">{selectedInstructor.full_name}</h2>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-red-500 rounded-xl" onClick={() => handleDeleteInstructor(selectedInstructor.id)}>
                                            Delete Instructor
                                        </Button>
                                    </div>

                                    {/* Profile Details Form */}
                                    <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6">
                                        <h3 className="text-lg font-bold font-outfit flex items-center gap-2">
                                            <UserCheck className="w-5 h-5 text-accent" /> Profile Details
                                        </h3>
                                        {/* Photo Upload */}
                                        <div className="flex items-center gap-6 mb-2">
                                            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-border bg-muted flex items-center justify-center shrink-0">
                                                {selectedInstructor.photo_url ? (
                                                    <img src={selectedInstructor.photo_url} alt={selectedInstructor.full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <UserCheck className="w-8 h-8 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Profile Photo</label>
                                                <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border border-border bg-muted text-sm font-medium hover:border-accent transition-colors ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                    {photoUploading ? 'Uploading…' : 'Upload Photo'}
                                                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
                                                </label>
                                            </div>
                                        </div>

                                        <form onSubmit={handleSaveInstructor} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
                                                <input value={instructorForm.full_name} onChange={e => setInstructorForm(f => ({ ...f, full_name: e.target.value }))}
                                                    className="w-full bg-muted/50 border border-border p-2.5 rounded-xl" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
                                                <input type="email" value={instructorForm.email} onChange={e => setInstructorForm(f => ({ ...f, email: e.target.value }))}
                                                    className="w-full bg-muted/50 border border-border p-2.5 rounded-xl" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</label>
                                                <input value={instructorForm.phone} onChange={e => setInstructorForm(f => ({ ...f, phone: e.target.value }))}
                                                    className="w-full bg-muted/50 border border-border p-2.5 rounded-xl" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Experience (years)</label>
                                                <input type="number" min="0" value={instructorForm.experience_years} onChange={e => setInstructorForm(f => ({ ...f, experience_years: e.target.value }))}
                                                    className="w-full bg-muted/50 border border-border p-2.5 rounded-xl" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Car className="w-3.5 h-3.5" /> Car Model</label>
                                                <input value={instructorForm.car_model} onChange={e => setInstructorForm(f => ({ ...f, car_model: e.target.value }))}
                                                    placeholder="e.g. Toyota Corolla" className="w-full bg-muted/50 border border-border p-2.5 rounded-xl" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Languages (comma-separated)</label>
                                                <input value={instructorForm.languages} onChange={e => setInstructorForm(f => ({ ...f, languages: e.target.value }))}
                                                    placeholder="English, Mandarin" className="w-full bg-muted/50 border border-border p-2.5 rounded-xl" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Star className="w-3.5 h-3.5" /> Rating (1–5)</label>
                                                <input type="number" min="1" max="5" step="0.1" value={instructorForm.rating} onChange={e => setInstructorForm(f => ({ ...f, rating: e.target.value }))}
                                                    className="w-full bg-muted/50 border border-border p-2.5 rounded-xl" />
                                            </div>
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bio</label>
                                                <textarea rows={3} value={instructorForm.bio} onChange={e => setInstructorForm(f => ({ ...f, bio: e.target.value }))}
                                                    className="w-full bg-muted/50 border border-border p-2.5 rounded-xl resize-none" />
                                            </div>
                                            <div className="md:col-span-2 flex justify-end">
                                                <Button type="submit" className="rounded-xl gap-2">Save Details</Button>
                                            </div>
                                        </form>
                                    </div>

                                    {/* Google Calendar connect */}
                                    <div className="bg-card border border-border rounded-[2.5rem] p-6 shadow-sm flex items-center justify-between gap-4">
                                        <div>
                                            <p className="font-bold text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-accent" /> Google Calendar</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {selectedInstructor?.google_calendar_refresh_token
                                                    ? "Calendar connected — bookings sync automatically to this instructor's Google Calendar."
                                                    : "Connect this instructor's Google account so their bookings appear in their own calendar."}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant={selectedInstructor?.google_calendar_refresh_token ? 'outline' : 'primary'}
                                            className="shrink-0 gap-2 rounded-xl"
                                            onClick={() => window.location.href = `/api/calendar/auth?instructorId=${selectedInstructor?.id}`}
                                        >
                                            <Calendar className="w-4 h-4" />
                                            {selectedInstructor?.google_calendar_refresh_token ? 'Reconnect' : 'Connect Calendar'}
                                        </Button>
                                    </div>

                                    {/* Availability Calendar */}
                                    <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-5">
                                        {/* Bulk availability setter */}
                                        <form onSubmit={handleBulkAvailability} className="bg-muted/50 border border-border rounded-2xl p-5 space-y-4">
                                            <div>
                                                <h4 className="font-bold text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-accent" /> Set Availability for Date Range</h4>
                                                <p className="text-xs text-muted-foreground mt-0.5">Sets availability for every day in the selected month range. Existing slots in that range are replaced.</p>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Month</label>
                                                    <input type="month" required value={bulkAvailForm.startMonth}
                                                        onChange={e => setBulkAvailForm(f => ({ ...f, startMonth: e.target.value }))}
                                                        className="w-full bg-white border border-border p-2 rounded-xl text-sm outline-none" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Month</label>
                                                    <input type="month" required value={bulkAvailForm.endMonth}
                                                        onChange={e => setBulkAvailForm(f => ({ ...f, endMonth: e.target.value }))}
                                                        className="w-full bg-white border border-border p-2 rounded-xl text-sm outline-none" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">From</label>
                                                    <input type="time" required value={bulkAvailForm.start_time}
                                                        onChange={e => setBulkAvailForm(f => ({ ...f, start_time: e.target.value }))}
                                                        className="w-full bg-white border border-border p-2 rounded-xl text-sm outline-none" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">To</label>
                                                    <input type="time" required value={bulkAvailForm.end_time}
                                                        onChange={e => setBulkAvailForm(f => ({ ...f, end_time: e.target.value }))}
                                                        className="w-full bg-white border border-border p-2 rounded-xl text-sm outline-none" />
                                                </div>
                                            </div>
                                            <Button type="submit" size="sm" className="rounded-xl gap-2" disabled={bulkAvailLoading}>
                                                {bulkAvailLoading ? 'Updating…' : 'Apply to All Days'}
                                            </Button>
                                        </form>

                                        <div className="flex items-start justify-between gap-4 flex-wrap">
                                            <div>
                                                <h3 className="text-lg font-bold font-outfit flex items-center gap-2">
                                                    <Clock className="w-5 h-5 text-accent" /> Availability Schedule
                                                </h3>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Drag to add a slot · Click a slot to remove it · Date-specific
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-xs shrink-0">
                                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> Available</span>
                                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Not Available</span>
                                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Paid booking</span>
                                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-500 inline-block" /> Pending</span>
                                            </div>
                                        </div>

                                        {/* Not-Available block form */}
                                        <form onSubmit={handleAddBlockedSlot} className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                                            <p className="text-sm font-bold text-red-700 flex items-center gap-2">🚫 Add Not-Available Block</p>
                                            <div className="flex flex-wrap gap-3 items-end">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-red-600">Date</label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={blockedSlotForm.date}
                                                        onChange={e => setBlockedSlotForm(f => ({ ...f, date: e.target.value }))}
                                                        className="bg-white border border-red-200 p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-300"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-red-600">From</label>
                                                    <input
                                                        type="time"
                                                        required
                                                        value={blockedSlotForm.start_time}
                                                        onChange={e => setBlockedSlotForm(f => ({ ...f, start_time: e.target.value }))}
                                                        className="bg-white border border-red-200 p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-300"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-red-600">To</label>
                                                    <input
                                                        type="time"
                                                        required
                                                        value={blockedSlotForm.end_time}
                                                        onChange={e => setBlockedSlotForm(f => ({ ...f, end_time: e.target.value }))}
                                                        className="bg-white border border-red-200 p-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-300"
                                                    />
                                                </div>
                                                <Button type="submit" size="sm" className="bg-red-500 hover:bg-red-600 text-white rounded-xl">Add Block</Button>
                                            </div>
                                        </form>

                                        {availabilityLoading ? (
                                            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                                                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                                <span className="text-sm">Loading schedule...</span>
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl overflow-hidden border border-border avail-cal">
                                                <style>{`.avail-cal .fc-timegrid-event-harness { inset-inline: 0 !important; }`}</style>
                                                <FullCalendar
                                                    plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
                                                    initialView="timeGridWeek"
                                                    headerToolbar={{
                                                        left: 'prev,next today',
                                                        center: 'title',
                                                        right: 'timeGridDay,timeGridWeek,dayGridMonth',
                                                    }}
                                                    locale="en-AU"
                                                    dayHeaderFormat={{ day: '2-digit', month: '2-digit', omitCommas: true }}
                                                    titleFormat={{ day: '2-digit', month: '2-digit', year: 'numeric' }}
                                                    allDaySlot={false}
                                                    slotMinTime="06:00:00"
                                                    slotMaxTime="21:00:00"
                                                    slotDuration="00:30:00"
                                                    slotLabelInterval="01:00"
                                                    height="auto"
                                                    expandRows={true}
                                                    selectable={true}
                                                    selectMirror={true}
                                                    select={handleCalendarSelect}
                                                    eventClick={(info) => {
                                                        if (info.event.extendedProps.type === 'booking') return
                                                        const label = info.event.extendedProps.slotType === 'blocked' ? 'not-available block' : 'availability slot'
                                                        if (confirm(`Remove this ${label} (${info.event.title})?`)) {
                                                            handleDeleteSlot(info.event.id)
                                                        }
                                                    }}
                                                    events={[
                                                        // Availability slots — green=available, red=blocked
                                                        ...instructorAvailability.map(slot => {
                                                            const isBlocked = slot.type === 'blocked'
                                                            const bg = isBlocked ? '#ef4444' : (slot.is_active ? '#22c55e' : '#d1d5db')
                                                            const border = isBlocked ? '#dc2626' : (slot.is_active ? '#16a34a' : '#9ca3af')
                                                            const label = `${isBlocked ? '🚫 ' : ''}${slot.start_time.slice(0, 5)} – ${slot.end_time.slice(0, 5)}`
                                                            return slot.specific_date ? ({
                                                                id: slot.id,
                                                                title: label,
                                                                start: `${slot.specific_date}T${slot.start_time.slice(0, 5)}`,
                                                                end: `${slot.specific_date}T${slot.end_time.slice(0, 5)}`,
                                                                backgroundColor: bg,
                                                                borderColor: border,
                                                                textColor: '#fff',
                                                                extendedProps: { type: 'availability', slotType: slot.type, is_active: slot.is_active },
                                                            }) : ({
                                                                id: slot.id,
                                                                title: label,
                                                                daysOfWeek: [slot.day_of_week],
                                                                startTime: slot.start_time.slice(0, 5),
                                                                endTime: slot.end_time.slice(0, 5),
                                                                backgroundColor: bg,
                                                                borderColor: border,
                                                                textColor: '#fff',
                                                                extendedProps: { type: 'availability', slotType: slot.type, is_active: slot.is_active },
                                                            })
                                                        }),
                                                        // Actual bookings for this instructor
                                                        ...allBookings
                                                            .filter(b => b.instructor_id === selectedInstructor?.id && b.status !== 'cancelled')
                                                            .map(b => {
                                                                const student = allUsers.find((u: any) => u.id === b.student_id)
                                                                const lesson = lessons.find((l: any) => l.id === b.lesson_id)
                                                                const startLocal = new Date(b.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Brisbane' })
                                                                const endLocal = new Date(b.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Brisbane' })
                                                                return {
                                                                    id: `booking-${b.id}`,
                                                                    title: student?.full_name || 'Booked',
                                                                    start: b.start_time,
                                                                    end: b.end_time,
                                                                    backgroundColor: b.payment_status === 'paid' ? '#3b82f6' : '#8b5cf6',
                                                                    borderColor: b.payment_status === 'paid' ? '#2563eb' : '#7c3aed',
                                                                    textColor: '#fff',
                                                                    extendedProps: {
                                                                        type: 'booking',
                                                                        student: student?.full_name,
                                                                        studentPhone: student?.phone,
                                                                        lesson: lesson?.title,
                                                                        status: b.status,
                                                                        payment: b.payment_status,
                                                                        pickupAddress: b.pickup_address,
                                                                        vehicleType: b.vehicle_type,
                                                                        transmissionType: b.transmission_type,
                                                                        timeRange: `${startLocal} – ${endLocal}`,
                                                                    },
                                                                }
                                                            }),
                                                    ]}
                                                    eventContent={(arg) => {
                                                        if (arg.event.extendedProps.type === 'booking') {
                                                            const p = arg.event.extendedProps
                                                            return (
                                                                <div
                                                                    className="px-2 py-1.5 h-full overflow-hidden flex flex-col gap-0.5 cursor-pointer"
                                                                    onMouseEnter={(e) => {
                                                                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                                                        // Position tooltip to the right of the event; fall back to left if near right edge
                                                                        const tooltipWidth = 240
                                                                        const spaceRight = window.innerWidth - rect.right
                                                                        const x = spaceRight >= tooltipWidth + 12
                                                                            ? rect.right + 8
                                                                            : rect.left - tooltipWidth - 8
                                                                        setCalendarTooltip({ props: p, x, y: rect.top })
                                                                    }}
                                                                    onMouseLeave={() => setCalendarTooltip(null)}
                                                                >
                                                                    <div className="text-xs font-bold leading-tight truncate">👤 {p.student}</div>
                                                                    <div className="text-[11px] font-medium opacity-95 truncate">{p.lesson}</div>
                                                                    <div className="text-[11px] font-semibold capitalize px-1.5 py-0.5 rounded-full bg-white/20 w-fit">
                                                                        {p.payment === 'paid' ? '✓ Paid' : '⏳ Pending'}
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                        const isBlocked = arg.event.extendedProps.slotType === 'blocked'
                                                        return (
                                                            <div className="px-2 py-1.5 h-full overflow-hidden flex flex-col gap-0.5">
                                                                <div className="text-xs font-bold leading-tight text-white">{arg.event.title}</div>
                                                                <div className="text-[11px] font-semibold text-white/90">
                                                                    {isBlocked ? '🚫 Not Available' : (arg.event.extendedProps.is_active ? '✓ Available' : '— Disabled')}
                                                                </div>
                                                            </div>
                                                        )
                                                    }}
                                                    slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: true }}
                                                    nowIndicator={true}
                                                    businessHours={instructorAvailability
                                                        .filter(s => s.is_active)
                                                        .map(s => ({
                                                            daysOfWeek: [s.day_of_week],
                                                            startTime: s.start_time.slice(0, 5),
                                                            endTime: s.end_time.slice(0, 5),
                                                        }))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <ReportsTab />
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

                            {/* Reports quick link from settings */}
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

            </div>

            {/* Manual Booking Modal */}
            {/* Edit Lesson Modal */}
            {editingLesson && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card border border-border w-full max-w-xl rounded-[2.5rem] shadow-2xl p-10 space-y-8 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold font-outfit">Edit Lesson</h2>
                                <p className="text-sm text-muted-foreground mt-1">{editingLesson.title}</p>
                            </div>
                            <button onClick={() => setEditingLesson(null)} className="p-2 hover:bg-muted rounded-full">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {lessonEditError && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" /> {lessonEditError}
                            </div>
                        )}

                        <form onSubmit={handleSaveLesson} className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</label>
                                <input
                                    required
                                    value={lessonEditForm.title}
                                    onChange={e => setLessonEditForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                                <textarea
                                    rows={2}
                                    value={lessonEditForm.description}
                                    onChange={e => setLessonEditForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={lessonEditForm.price}
                                        onChange={e => setLessonEditForm(f => ({ ...f, price: e.target.value }))}
                                        className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Duration (mins)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={lessonEditForm.duration_minutes}
                                        onChange={e => setLessonEditForm(f => ({ ...f, duration_minutes: e.target.value }))}
                                        className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                    />
                                </div>
                            </div>

                            {/* Package toggle */}
                            <div className="flex items-center gap-3 p-4 bg-muted/50 border border-border rounded-xl">
                                <input
                                    id="edit_is_package"
                                    type="checkbox"
                                    checked={lessonEditForm.is_package}
                                    onChange={e => setLessonEditForm(f => ({ ...f, is_package: e.target.checked, lesson_count: e.target.checked ? f.lesson_count : '1' }))}
                                    className="w-4 h-4 accent-accent cursor-pointer"
                                />
                                <label htmlFor="edit_is_package" className="text-sm font-bold cursor-pointer select-none">
                                    Package bundle (multiple lessons)
                                </label>
                            </div>

                            {lessonEditForm.is_package && (
                                <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Number of Lessons in Package</label>
                                    <input
                                        type="number"
                                        min="2"
                                        required={lessonEditForm.is_package}
                                        value={lessonEditForm.lesson_count}
                                        onChange={e => setLessonEditForm(f => ({ ...f, lesson_count: e.target.value }))}
                                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                    />
                                    {lessonEditForm.duration_minutes && lessonEditForm.lesson_count && (
                                        (() => {
                                            const d = parseInt(lessonEditForm.duration_minutes)
                                            const c = parseInt(lessonEditForm.lesson_count)
                                            const valid = c >= 2 && d % c === 0
                                            return (
                                                <p className={`text-xs font-medium ${valid ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {valid
                                                        ? `✓ ${d / c} mins per session`
                                                        : `${d} ÷ ${c} = ${(d / c).toFixed(2)} — must be a whole number`}
                                                </p>
                                            )
                                        })()
                                    )}
                                </div>
                            )}

                            {/* Active toggle */}
                            <div className="flex items-center gap-3 p-4 bg-muted/50 border border-border rounded-xl">
                                <input
                                    id="edit_is_active"
                                    type="checkbox"
                                    checked={lessonEditForm.is_active}
                                    onChange={e => setLessonEditForm(f => ({ ...f, is_active: e.target.checked }))}
                                    className="w-4 h-4 accent-accent cursor-pointer"
                                />
                                <label htmlFor="edit_is_active" className="text-sm font-bold cursor-pointer select-none">
                                    Active (visible to students)
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setEditingLesson(null)}>Cancel</Button>
                                <Button type="submit" isLoading={lessonEditLoading}>Save Changes</Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Edit Booking Modal */}
            {editingBooking && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card border border-border w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 space-y-8 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold font-outfit">Edit Booking</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {allUsers.find((u: any) => u.id === editingBooking.student_id)?.full_name || 'Unknown Student'}
                                </p>
                            </div>
                            <button onClick={() => setEditingBooking(null)} className="p-2 hover:bg-muted rounded-full">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {bookingEditError && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" /> {bookingEditError}
                            </div>
                        )}

                        <form onSubmit={handleSaveBookingEdit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {editingBooking.hire_id ? (
                                    /* ── Hire booking — read-only hire label, direct time input ── */
                                    <>
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vehicle Hire</label>
                                            <p className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm">
                                                {vehicleHires.find((h: any) => h.id === editingBooking.hire_id)?.title || 'Vehicle Hire'}
                                            </p>
                                        </div>

                                        {/* Date */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</label>
                                            <input
                                                type="date"
                                                required
                                                value={bookingEditForm.date}
                                                onChange={e => setBookingEditForm(f => ({ ...f, date: e.target.value }))}
                                                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                            />
                                        </div>

                                        {/* Time — direct input, no slot picker needed for hire */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Time</label>
                                            <input
                                                type="time"
                                                required
                                                value={bookingEditForm.time}
                                                onChange={e => setBookingEditForm(f => ({ ...f, time: e.target.value }))}
                                                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                            />
                                        </div>

                                        {/* Existing bookings for this vehicle on selected date */}
                                        {bookingEditForm.date && (() => {
                                            const dayBookings = allBookings.filter((b: any) =>
                                                b.hire_id === editingBooking.hire_id &&
                                                b.id !== editingBooking.id &&
                                                b.status === 'scheduled' &&
                                                new Date(b.start_time).toLocaleDateString('en-CA', { timeZone: 'Australia/Brisbane' }) === bookingEditForm.date
                                            )
                                            if (!dayBookings.length) return null
                                            return (
                                                <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                                                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Already booked on this date</p>
                                                    {dayBookings.map((b: any) => (
                                                        <p key={b.id} className="text-xs text-amber-800">
                                                            {new Date(b.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Brisbane' })}
                                                            {' – '}
                                                            {new Date(b.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Brisbane' })}
                                                            {' · '}
                                                            {allUsers.find((u: any) => u.id === b.student_id)?.full_name || 'Unknown student'}
                                                        </p>
                                                    ))}
                                                </div>
                                            )
                                        })()}
                                    </>
                                ) : (
                                    /* ── Lesson booking — instructor + lesson selects + slot picker ── */
                                    <>
                                        {/* Instructor */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Instructor</label>
                                            <select
                                                value={bookingEditForm.instructorId}
                                                onChange={e => setBookingEditForm(f => ({ ...f, instructorId: e.target.value, time: '' }))}
                                                required
                                                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                            >
                                                <option value="">Select instructor</option>
                                                {instructors.map((inst: any) => (
                                                    <option key={inst.id} value={inst.id}>{inst.full_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Lesson */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lesson</label>
                                            <select
                                                value={bookingEditForm.lessonId}
                                                onChange={e => setBookingEditForm(f => ({ ...f, lessonId: e.target.value, time: '' }))}
                                                required
                                                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                            >
                                                <option value="">Select lesson</option>
                                                {lessons.map((l: any) => (
                                                    <option key={l.id} value={l.id}>{l.title} — ${l.price}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Date */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</label>
                                            <input
                                                type="date"
                                                required
                                                value={bookingEditForm.date}
                                                onChange={e => setBookingEditForm(f => ({ ...f, date: e.target.value, time: '' }))}
                                                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                            />
                                        </div>

                                        {/* Time — slot picker */}
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                Available Times
                                                {bookingEditForm.date && bookingEditForm.instructorId && (
                                                    <span className="ml-2 normal-case font-normal text-muted-foreground/70">
                                                        — {new Date(bookingEditForm.date + 'T00:00:00').toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                                                    </span>
                                                )}
                                            </label>
                                            {!bookingEditForm.instructorId || !bookingEditForm.date ? (
                                                <p className="text-xs text-muted-foreground italic">Select an instructor and date to see available times.</p>
                                            ) : slotsLoading ? (
                                                <div className="flex items-center gap-2 py-2">
                                                    <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-xs text-muted-foreground">Loading available times…</span>
                                                </div>
                                            ) : slotsMessage ? (
                                                <p className="text-xs text-amber-600 font-medium">{slotsMessage}</p>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {availableSlots.map(slot => (
                                                        <button
                                                            key={slot.value}
                                                            type="button"
                                                            onClick={() => setBookingEditForm(f => ({ ...f, time: slot.value }))}
                                                            className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                                                                bookingEditForm.time === slot.value
                                                                    ? 'bg-accent text-white border-accent shadow-sm'
                                                                    : 'bg-muted border-border hover:border-accent/50 text-foreground'
                                                            }`}
                                                        >
                                                            {slot.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <input type="hidden" name="time" value={bookingEditForm.time} required />
                                        </div>
                                    </>
                                )}

                                {/* Status */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Booking Status</label>
                                    <select
                                        value={bookingEditForm.status}
                                        onChange={e => setBookingEditForm(f => ({ ...f, status: e.target.value }))}
                                        className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                    >
                                        <option value="scheduled">Scheduled</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="rescheduled">Rescheduled</option>
                                    </select>
                                </div>

                                {/* Payment Status */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Status</label>
                                    <select
                                        value={bookingEditForm.paymentStatus}
                                        onChange={e => setBookingEditForm(f => ({ ...f, paymentStatus: e.target.value }))}
                                        className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                        <option value="failed">Failed</option>
                                        <option value="refunded">Refunded</option>
                                    </select>
                                </div>

                                {/* Vehicle Type */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vehicle Type</label>
                                    <select
                                        value={bookingEditForm.vehicleType}
                                        onChange={e => setBookingEditForm(f => ({ ...f, vehicleType: e.target.value }))}
                                        className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                    >
                                        <option value="car">Car</option>
                                        <option value="truck">Truck</option>
                                    </select>
                                </div>

                                {/* Transmission */}
                                {bookingEditForm.vehicleType === 'car' && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transmission</label>
                                        <select
                                            value={bookingEditForm.transmissionType}
                                            onChange={e => setBookingEditForm(f => ({ ...f, transmissionType: e.target.value }))}
                                            className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                        >
                                            <option value="auto">Automatic</option>
                                            <option value="manual">Manual</option>
                                        </select>
                                    </div>
                                )}

                                {/* Pickup Address */}
                                <div className={`space-y-1 ${bookingEditForm.vehicleType === 'car' ? '' : 'md:col-span-2'}`}>
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pickup Address</label>
                                    <input
                                        type="text"
                                        value={bookingEditForm.pickupAddress}
                                        onChange={e => setBookingEditForm(f => ({ ...f, pickupAddress: e.target.value }))}
                                        placeholder="Pickup address"
                                        className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setEditingBooking(null)}>Cancel</Button>
                                <Button type="submit" isLoading={bookingEditLoading} disabled={!bookingEditForm.time}>Save Changes</Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 space-y-8"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold font-outfit">Edit User</h2>
                                <p className="text-sm text-muted-foreground mt-1">{editingUser.full_name}</p>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-muted rounded-full">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {userFormError && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <p>{userFormError}</p>
                            </div>
                        )}

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
                                <input
                                    type="email"
                                    value={editingUser.email ?? ''}
                                    readOnly
                                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
                                <input
                                    type="text"
                                    value={userForm.full_name}
                                    onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))}
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</label>
                                    <input
                                        type="text"
                                        value={userForm.phone}
                                        onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))}
                                        className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Address</label>
                                <input
                                    type="text"
                                    value={userForm.address}
                                    onChange={e => setUserForm(f => ({ ...f, address: e.target.value }))}
                                    placeholder="Home address"
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                className="flex-1 rounded-xl"
                                onClick={saveUserEdit}
                                isLoading={userFormLoading}
                            >
                                Save Changes
                            </Button>
                            <Button variant="outline" className="rounded-xl" onClick={() => setEditingUser(null)}>
                                Cancel
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {showManualBookingModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card border border-border w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 space-y-8 overflow-y-auto max-h-[90vh]"
                    >
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold font-outfit">Manual Lesson Booking</h2>
                            <button onClick={() => { setShowManualBookingModal(false); setManualBookingError(null) }} className="p-2 hover:bg-muted rounded-full">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {manualBookingError && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <p>{manualBookingError}</p>
                            </div>
                        )}

                        <form onSubmit={handleManualBooking} className="space-y-6">

                            {/* Student — existing or new */}
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setManualBookingTab('existing')}
                                        className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${manualBookingTab === 'existing' ? 'bg-accent text-white border-accent' : 'bg-muted border-border text-muted-foreground'}`}>
                                        Existing Student
                                    </button>
                                    <button type="button" onClick={() => setManualBookingTab('new')}
                                        className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${manualBookingTab === 'new' ? 'bg-accent text-white border-accent' : 'bg-muted border-border text-muted-foreground'}`}>
                                        New Student
                                    </button>
                                </div>

                                {manualBookingTab === 'existing' ? (
                                    <select required className="w-full bg-muted border border-border p-3 rounded-xl outline-none text-sm"
                                        value={bookingData.studentId}
                                        onChange={e => setBookingData({ ...bookingData, studentId: e.target.value })}>
                                        <option value="">Select Student</option>
                                        {allUsers.map((u: any) => (
                                            <option key={u.id} value={u.id}>{u.full_name}{u.email ? ` (${u.email})` : ''}{u.phone ? ` · ${u.phone}` : ''}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Personal Details</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name *</label>
                                                <input required type="text" placeholder="Jane Smith"
                                                    value={newStudentForm.full_name}
                                                    onChange={e => setNewStudentForm(f => ({ ...f, full_name: e.target.value }))}
                                                    className="w-full bg-muted border border-border p-2.5 rounded-xl text-sm outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile *</label>
                                                <input required type="tel" placeholder="04xx xxx xxx"
                                                    value={newStudentForm.phone}
                                                    onChange={e => setNewStudentForm(f => ({ ...f, phone: e.target.value }))}
                                                    className="w-full bg-muted border border-border p-2.5 rounded-xl text-sm outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
                                                <input type="email" placeholder="jane@email.com"
                                                    value={newStudentForm.email}
                                                    onChange={e => setNewStudentForm(f => ({ ...f, email: e.target.value }))}
                                                    className="w-full bg-muted border border-border p-2.5 rounded-xl text-sm outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gender</label>
                                                <select value={newStudentForm.gender}
                                                    onChange={e => setNewStudentForm(f => ({ ...f, gender: e.target.value }))}
                                                    className="w-full bg-muted border border-border p-2.5 rounded-xl text-sm outline-none">
                                                    <option value="">Select gender</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="non_binary">Non-binary</option>
                                                    <option value="prefer_not_to_say">Prefer not to say</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Address</label>
                                            <input type="text" placeholder="123 Main St, Suburb QLD 4000"
                                                value={newStudentForm.address}
                                                onChange={e => setNewStudentForm(f => ({ ...f, address: e.target.value }))}
                                                className="w-full bg-muted border border-border p-2.5 rounded-xl text-sm outline-none" />
                                        </div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 pt-1">Licence Details</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Licence Number</label>
                                                <input type="text" placeholder="012345678"
                                                    value={newStudentForm.license_number}
                                                    onChange={e => setNewStudentForm(f => ({ ...f, license_number: e.target.value }))}
                                                    className="w-full bg-muted border border-border p-2.5 rounded-xl text-sm outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Licence Expiry</label>
                                                <input type="date"
                                                    value={newStudentForm.license_expiry}
                                                    onChange={e => setNewStudentForm(f => ({ ...f, license_expiry: e.target.value }))}
                                                    className="w-full bg-muted border border-border p-2.5 rounded-xl text-sm outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Instructor</label>
                                    <select required className="w-full bg-muted border border-border p-3 rounded-xl outline-none text-sm"
                                        value={bookingData.instructorId}
                                        onChange={e => setBookingData({ ...bookingData, instructorId: e.target.value, time: '' })}>
                                        <option value="">Select Instructor</option>
                                        {instructors.map((inst: any) => (
                                            <option key={inst.id} value={inst.id}>{inst.full_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lesson Type</label>
                                    <select required className="w-full bg-muted border border-border p-3 rounded-xl outline-none text-sm"
                                        value={bookingData.lessonId}
                                        onChange={e => setBookingData({ ...bookingData, lessonId: e.target.value, time: '' })}>
                                        <option value="">Select Lesson</option>
                                        {lessons.filter(l => l.is_active).map(l => (
                                            <option key={l.id} value={l.id}>{l.title} — {l.duration_minutes}min · ${l.price}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</label>
                                    <input required type="date"
                                        className="w-full bg-muted border border-border p-3 rounded-xl outline-none text-sm"
                                        value={bookingData.date}
                                        onChange={e => setBookingData({ ...bookingData, date: e.target.value, time: '' })} />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Available Times
                                        {bookingData.date && bookingData.instructorId && (
                                            <span className="ml-2 normal-case font-normal text-muted-foreground/70">
                                                — {new Date(bookingData.date + 'T00:00:00').toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </span>
                                        )}
                                    </label>
                                    {!bookingData.instructorId || !bookingData.date ? (
                                        <p className="text-xs text-muted-foreground italic">Select an instructor and date to see available times.</p>
                                    ) : newBookingSlotsLoading ? (
                                        <div className="flex items-center gap-2 py-2">
                                            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                            <span className="text-xs text-muted-foreground">Loading available times…</span>
                                        </div>
                                    ) : newBookingSlotsMessage ? (
                                        <p className="text-xs text-amber-600 font-medium">{newBookingSlotsMessage}</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {newBookingSlots.map(slot => (
                                                <button
                                                    key={slot.value}
                                                    type="button"
                                                    onClick={() => setBookingData({ ...bookingData, time: slot.value })}
                                                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                                                        bookingData.time === slot.value
                                                            ? 'bg-accent text-white border-accent shadow-sm'
                                                            : 'bg-muted border-border hover:border-accent/50 text-foreground'
                                                    }`}
                                                >
                                                    {slot.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <input type="hidden" name="time" value={bookingData.time} required />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vehicle Type</label>
                                    <select className="w-full bg-muted border border-border p-3 rounded-xl outline-none text-sm"
                                        value={bookingData.vehicleType}
                                        onChange={e => setBookingData({ ...bookingData, vehicleType: e.target.value as 'car' | 'truck', transmission: e.target.value === 'truck' ? 'auto' : bookingData.transmission })}>
                                        <option value="car">🚗 Car</option>
                                        <option value="truck">🚛 Truck</option>
                                    </select>
                                </div>

                                {bookingData.vehicleType === 'car' && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transmission</label>
                                    <select className="w-full bg-muted border border-border p-3 rounded-xl outline-none text-sm"
                                        value={bookingData.transmission}
                                        onChange={e => setBookingData({ ...bookingData, transmission: e.target.value })}>
                                        <option value="auto">Automatic</option>
                                        <option value="manual">Manual</option>
                                    </select>
                                </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment</label>
                                    <select className="w-full bg-muted border border-border p-3 rounded-xl outline-none text-sm"
                                        value={bookingData.paymentMethod}
                                        onChange={e => setBookingData({ ...bookingData, paymentMethod: e.target.value as any })}>
                                        <option value="pending">Pending</option>
                                        <option value="paid">Already Paid</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pickup Address</label>
                                <input type="text" placeholder="Student's pickup location"
                                    value={bookingData.pickupAddress}
                                    onChange={e => setBookingData({ ...bookingData, pickupAddress: e.target.value })}
                                    className="w-full bg-muted border border-border p-3 rounded-xl outline-none text-sm" />
                            </div>

                            <Button type="submit" size="lg" className="w-full rounded-2xl h-14 text-lg" isLoading={loading}>
                                Confirm Booking
                            </Button>
                        </form>
                    </motion.div>
                </div>
            )}
            </main>
        </div>
    )
}
