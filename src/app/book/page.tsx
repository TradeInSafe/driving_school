'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Clock, User, CheckCircle2, Star, CreditCard, ShieldCheck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import CheckoutForm from '@/components/CheckoutForm'
import { useSearchParams } from 'next/navigation'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const steps = ['Lesson', 'Instructor', 'Schedule', 'Confirm']

export default function BookingPage() {
    const searchParams = useSearchParams()

    const { user, loading: authLoading } = useAuth()
    const [currentStep, setCurrentStep] = useState(0)
    const [selectedLesson, setSelectedLesson] = useState<any>(null)
    const [selectedInstructor, setSelectedInstructor] = useState<any>(null)
    const [selectedSlots, setSelectedSlots] = useState<any[]>([])
    const [lessons, setLessons] = useState<any[]>([])
    const [instructors, setInstructors] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [isBookingComplete, setIsBookingComplete] = useState(false)
    const [instructorAvailability, setInstructorAvailability] = useState<any[]>([])
    const [instructorBookings, setInstructorBookings] = useState<any[]>([])
    const [pickupAddress, setPickupAddress] = useState('')
    const [transmissionType, setTransmissionType] = useState<'auto' | 'manual'>('auto')
    const [creditsRemaining, setCreditsRemaining] = useState(0)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        if (!loading && lessons.length > 0 && instructors.length > 0) {
            const lessonId = searchParams.get('lessonId')
            const instructorId = searchParams.get('instructorId')

            if (lessonId) {
                const lesson = lessons.find(l => l.id === lessonId)
                if (lesson) setSelectedLesson(lesson)
            }

            if (instructorId) {
                const instructor = instructors.find(i => i.id === instructorId)
                if (instructor) {
                    setSelectedInstructor(instructor)
                    fetchInstructorAvailability(instructorId)
                    // If we have both, maybe jump to schedule
                    if (lessonId) setCurrentStep(2)
                }
            }
        }
    }, [loading, lessons, instructors, searchParams])
    const [packageExpiry, setPackageExpiry] = useState<string | null>(null)
    const [lastBookingDate, setLastBookingDate] = useState<Date | null>(null)
    const [isBookingWithCredit, setIsBookingWithCredit] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch Lessons
            const { data: lessonsData } = await supabase
                .from('lessons')
                .select('*')
                .eq('is_active', true)

            if (lessonsData) setLessons(lessonsData)

            // Fetch Instructors
            const { data: instructorsData, error: instError } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'instructor')
                
            if (instError) {
                console.error("Instructors fetch error:", instError)
            } else if (instructorsData) {
                setInstructors(instructorsData)
            }

            // Fetch Student credits and last booking
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('credits_remaining, package_expiry')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    setCreditsRemaining(profile.credits_remaining || 0)
                    setPackageExpiry(profile.package_expiry)
                }

                const { data: lastBooking } = await supabase
                    .from('bookings')
                    .select('start_time')
                    .eq('student_id', user.id)
                    .order('start_time', { ascending: false })
                    .limit(1)
                    .single()

                if (lastBooking) {
                    setLastBookingDate(new Date(lastBooking.start_time))
                }
            }

        } catch (err) {
            console.error('Error fetching data:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchInstructorAvailability = async (instructorId: string) => {
        try {
            // Fetch weekly availability
            const { data: availabilityData } = await supabase
                .from('availability')
                .select('*')
                .eq('instructor_id', instructorId)
                .eq('is_active', true)

            if (availabilityData) setInstructorAvailability(availabilityData)

            // Fetch combined availability constraints from Supabase and Google Calendar
            try {
                const res = await fetch(`/api/calendar/busy?instructorId=${instructorId}`)
                const data = await res.json()
                if (data.busySlots) {
                    setInstructorBookings(data.busySlots)
                }
            } catch (pollErr) {
                console.error("Failed to fetch busy slots API:", pollErr)
            }
        } catch (err) {
            console.error('Error fetching instructor availability:', err)
        }
    }

    const handleNext = async () => {
        if (currentStep === 2) {
            // If user has credits, skip payment intent creation and create booking later
            if (creditsRemaining > 0) {
                setCurrentStep(3)
                return
            }

            // Before moving to confirmation, create a pending booking and payment intent
            try {
                setLoading(true)

                // 1. Create a pending booking in Supabase
                const pendingBookings = selectedSlots.map(slot => ({
                    student_id: user?.id,
                    instructor_id: selectedInstructor.id,
                    lesson_id: selectedLesson.id,
                    start_time: slot.startStr,
                    end_time: slot.endStr,
                    status: 'scheduled',
                    payment_status: 'pending',
                    pickup_address: pickupAddress,
                    transmission_type: transmissionType
                }))

                const { data: bookings, error: bookingError } = await supabase
                    .from('bookings')
                    .insert(pendingBookings)
                    .select()

                if (bookingError) throw bookingError

                // 2. Create payment intent passing all booking ids
                const response = await fetch('/api/create-payment-intent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lessonId: selectedLesson.id,
                        bookingIds: bookings.map((b: any) => b.id).join(',')
                    }),
                })
                const data = await response.json()

                if (data.bypassStripe) {
                    // Instantly simulate completion
                    setIsBookingComplete(true)
                    return // Prevent going to step 3 which shows the stripe form
                } else if (data.clientSecret) {
                    setClientSecret(data.clientSecret)
                } else if (data.error) {
                    console.error('Stripe initialization failed:', data.error)
                    setErrorMsg('Payment gateway error. Please try again.')
                    return
                }
            } catch (err: any) {
                console.error('Error initiating booking:', err.message)
                setErrorMsg('An error occurred during booking setup.')
                return
            } finally {
                setLoading(false)
            }
        }
        if (currentStep === 0 && instructors.length === 1) {
            setSelectedInstructor(instructors[0]);
            fetchInstructorAvailability(instructors[0].id);
            setCurrentStep(2);
            return;
        }

        setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
    }

    const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 0))

    const handleDateSelect = (selectInfo: any) => {
        // Conflict check
        const isConflict = instructorBookings.some(booking => {
            const bStart = new Date(booking.start).getTime()
            const bEnd = new Date(booking.end).getTime()
            const sStart = new Date(selectInfo.startStr).getTime()
            const sEnd = new Date(selectInfo.endStr).getTime()
            return (sStart < bEnd && sEnd > bStart)
        })

        if (isConflict) {
            setErrorMsg('This slot is already booked. Please select another time.')
            return
        }

        // Sequential check (cannot book before last lesson)
        if (lastBookingDate && new Date(selectInfo.startStr) < lastBookingDate) {
            setErrorMsg(`Out of Order: Your next lesson must be scheduled after your last existing appointment (${lastBookingDate.toLocaleDateString()}).`)
            return
        }

        const isPackage = selectedLesson?.duration_minutes >= 300
        const maxSlots = isPackage ? (selectedLesson.duration_minutes / 60) : 1

        let newSlots = [...selectedSlots]
        if (newSlots.length >= maxSlots) {
            setErrorMsg(`You can only select up to ${maxSlots} slot(s) for this package.`)
            return
        }

        newSlots.push(selectInfo)
        setSelectedSlots(newSlots)
        setErrorMsg(null)

        if (newSlots.length === maxSlots && maxSlots === 1) {
            handleNext()
        }
    }

    const handleBookWithCredit = async () => {
        if (!user || creditsRemaining <= 0) return

        setIsBookingWithCredit(true)
        try {
            // Send the first slot since handleBookWithCredit usually handles 1 lesson at a time
            const res = await fetch('/api/book-lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: user.id,
                    instructorId: selectedInstructor.id,
                    lessonId: selectedLesson.id,
                    startTime: selectedSlots[0].startStr,
                    endTime: selectedSlots[0].endStr,
                    pickupAddress,
                    transmissionType
                })
            })

            const data = await res.json()
            if (data.success) {
                setIsBookingComplete(true)
            } else {
                alert(data.error || 'Failed to book lesson.')
            }
        } catch (err) {
            console.error('Error booking with credit:', err)
            alert('An unexpected error occurred.')
        } finally {
            setIsBookingWithCredit(false)
        }
    }

    const renderStepContent = () => {
        if (isBookingComplete) {
            return (
                <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-in fade-in zoom-in-95">
                    <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-green-600">
                        <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold">Booking Confirmed!</h2>
                        <p className="text-muted-foreground">Thank you for your booking. You'll receive a confirmation email shortly.</p>
                    </div>
                    <div className="pt-6">
                        <Button onClick={() => window.location.href = '/dashboard'} className="rounded-xl w-full">Go to Dashboard</Button>
                    </div>
                </div>
            )
        }

        if (!loading && lessons.length === 0 && currentStep === 0) {
            return (
                <div className="max-w-2xl mx-auto bg-card border border-border p-12 rounded-[2.5rem] shadow-xl text-center space-y-8 animate-in fade-in zoom-in-95">
                    <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-amber-600">
                        <AlertCircle className="w-12 h-12" />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-3xl font-bold font-outfit">Setup Required</h2>
                        <p className="text-muted-foreground">To see the booking flow, you need to complete the following steps:</p>
                    </div>
                    <div className="text-left space-y-4 max-w-md mx-auto bg-muted/50 p-6 rounded-2xl border border-border">
                        <div className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                            <p className="text-sm">Put your Supabase keys in <code>.env.local</code></p>
                        </div>
                        <div className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                            <p className="text-sm">Run <code>supabase/schema.sql</code> in your Supabase SQL Editor</p>
                        </div>
                        <div className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                            <p className="text-sm">Restart the development server with <code>npm run dev</code></p>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground italic">Refer to walkthrough.md for the full guide.</p>
                </div>
            )
        }

        switch (currentStep) {
            case 0:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                        {lessons.map(lesson => (
                            <button
                                key={lesson.id}
                                onClick={() => { setSelectedLesson(lesson); handleNext(); }}
                                className={`p-8 rounded-[2rem] border-2 text-left transition-all space-y-4 ${selectedLesson?.id === lesson.id ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-border bg-card hover:border-accent/40'}`}
                            >
                                <div className="bg-accent/10 w-12 h-12 rounded-xl flex items-center justify-center text-accent">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold">{lesson.title}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{lesson.description}</p>
                                </div>
                                <div className="pt-4 flex justify-between items-center">
                                    <span className="text-2xl font-bold">${lesson.price}</span>
                                    <span className="text-xs font-bold text-accent uppercase tracking-widest">{lesson.duration_minutes}m sesssion</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )
            case 1:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4">
                        {instructors.map(inst => (
                            <button
                                key={inst.id}
                                onClick={() => {
                                    setSelectedInstructor(inst);
                                    fetchInstructorAvailability(inst.id);
                                    handleNext();
                                }}
                                className={`p-8 rounded-[2.5rem] border-2 text-left transition-all flex items-center gap-8 ${selectedInstructor?.id === inst.id ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-border bg-card hover:border-accent/40'}`}
                            >
                                <img src={inst.avatar_url || 'https://i.pravatar.cc/150'} alt={inst.full_name} className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" />
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-bold">{inst.full_name}</h3>
                                        <div className="flex items-center gap-2 text-sm text-secondary font-bold">
                                            <Star className="w-4 h-4 fill-secondary" /> {inst.rating || '5.0'} • {inst.experience_years || '0'} exp
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{inst.bio}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )
            case 2:
                const isPackage = selectedLesson?.duration_minutes >= 300
                const maxSlots = isPackage ? (selectedLesson.duration_minutes / 60) : 1
                const selectedEvents = selectedSlots.map((s: any, i: number) => ({
                    start: s.startStr,
                    end: s.endStr,
                    title: `Lesson ${i + 1}/${maxSlots}`,
                    backgroundColor: '#3b82f6',
                    className: 'selected-slot'
                }))

                return (
                    <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-xl animate-in fade-in zoom-in-95 overflow-hidden">
                        {errorMsg && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="text-sm font-bold">{errorMsg}</p>
                            </div>
                        )}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg font-outfit text-primary">
                                {isPackage ? `Select your ${maxSlots} sessions (${selectedSlots.length}/${maxSlots})` : 'Select your appointment time'}
                            </h3>
                            <div className="space-x-4 flex items-center">
                                {selectedSlots.length > 0 && (
                                    <Button variant="outline" size="sm" onClick={() => setSelectedSlots([])} className="rounded-xl">Clear All</Button>
                                )}
                                {selectedSlots.length === maxSlots && maxSlots > 1 && (
                                    <Button size="sm" onClick={handleNext} className="rounded-xl gap-2 font-bold shadow-lg shadow-accent/20">Confirm Schedule <CheckCircle2 className="w-4 h-4" /></Button>
                                )}
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
                            selectable={true}
                            selectMirror={true}
                            dayMaxEvents={true}
                            allDaySlot={false}
                            slotMinTime="07:00:00"
                            slotMaxTime="20:00:00"
                            height="auto"
                            select={(info) => handleDateSelect(info)}
                            events={[...instructorBookings, ...selectedEvents]}
                            businessHours={instructorAvailability.length > 0 ? instructorAvailability.map(a => ({
                                daysOfWeek: [a.day_of_week],
                                startTime: a.start_time,
                                endTime: a.end_time,
                            })) : {
                                daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
                                startTime: '07:00',
                                endTime: '20:00',
                            }}
                        />
                    </div>
                )
            case 3:
                return (
                    <div className="max-w-2xl mx-auto bg-card border border-border p-8 md:p-12 rounded-[2.5rem] shadow-2xl space-y-10 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <ShieldCheck className="w-48 h-48 text-primary" />
                        </div>

                        <div className="space-y-6 relative">
                            <h2 className="text-3xl font-bold font-outfit">Booking Confirmation</h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-muted rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-lg"><Clock className="w-4 h-4 text-accent" /></div>
                                        <span className="font-medium">{selectedLesson?.title}</span>
                                    </div>
                                    <span className="font-bold">${selectedLesson?.price}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-muted rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-lg"><User className="w-4 h-4 text-accent" /></div>
                                        <span className="font-medium">Instructor: {selectedInstructor?.full_name}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-muted rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-lg"><CalendarIcon className="w-4 h-4 text-accent" /></div>
                                        <span className="font-medium">
                                            {selectedSlots.length > 0 && new Date(selectedSlots[0].startStr).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                                            {selectedSlots.length > 1 && <span className="text-accent font-bold"> (+ {selectedSlots.length - 1} more date{selectedSlots.length > 2 ? 's' : ''})</span>}
                                            <br />
                                            <span className="text-xs text-muted-foreground">{selectedSlots.length > 0 && new Date(selectedSlots[0].startStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-lg font-outfit">Additional Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pickup Address</label>
                                        <input
                                            type="text"
                                            required
                                            value={pickupAddress}
                                            onChange={(e) => setPickupAddress(e.target.value)}
                                            placeholder="Enter your pickup location"
                                            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent/20 transition-all text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transmission</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setTransmissionType('auto')}
                                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${transmissionType === 'auto' ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' : 'bg-muted text-muted-foreground border-border'}`}
                                            >
                                                Automatic
                                            </button>
                                            <button
                                                onClick={() => setTransmissionType('manual')}
                                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${transmissionType === 'manual' ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' : 'bg-muted text-muted-foreground border-border'}`}
                                            >
                                                Manual
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-border space-y-6 relative">
                            {creditsRemaining > 0 ? (
                                <div className="space-y-6">
                                    {packageExpiry && new Date() > new Date(packageExpiry) ? (
                                        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex items-center gap-3 text-red-600">
                                            <AlertCircle className="w-5 h-5 shrink-0" />
                                            <div>
                                                <p className="font-bold text-sm">Package Expired</p>
                                                <p className="text-xs">Your credits expired on {new Date(packageExpiry).toLocaleDateString()}. Please purchase a new pack.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-accent/5 border border-accent/20 p-6 rounded-2xl space-y-4">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground">Available Credits</span>
                                                    <span className="font-bold text-accent">{creditsRemaining} Lessons</span>
                                                </div>
                                                {packageExpiry && (
                                                    <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                                                        <span>Package Expires</span>
                                                        <span>{new Date(packageExpiry).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                onClick={handleBookWithCredit}
                                                isLoading={isBookingWithCredit}
                                                size="lg"
                                                className="w-full h-16 rounded-2xl text-xl gap-2 shadow-xl shadow-accent/20"
                                            >
                                                <span>Use 1 Credit to Book</span>
                                                <CheckCircle2 className="w-6 h-6" />
                                            </Button>
                                            <p className="text-center text-xs text-muted-foreground">This session will be deducted from your available package credits.</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <CreditCard className="w-4 h-4" /> Secure payment with Stripe
                                    </div>

                                    {clientSecret ? (
                                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                                            <CheckoutForm amount={selectedLesson.price} onSuccess={async () => {
                                                try {
                                                    // Add an extra check by updating the backend. 
                                                    // In production this should be done purely via Webhooks.
                                                    const { data, error } = await supabase
                                                        .from('bookings')
                                                        .update({ payment_status: 'paid' })
                                                        .eq('student_id', user?.id)
                                                        .eq('payment_status', 'pending')
                                                        .order('created_at', { ascending: false })
                                                        .limit(1)
                                                        .select()

                                                    if (error) console.error('Failed to update booking status locally:', error.message)
                                                } catch (err) { }

                                                setIsBookingComplete(true)
                                            }} />
                                        </Elements>
                                    ) : (
                                        <div className="flex justify-center p-8">
                                            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    if (authLoading) return null

    return (
        <div className="max-w-7xl mx-auto px-4 py-20 space-y-12 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-end gap-8">
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold font-outfit">Book Your <span className="text-accent underline decoration-secondary">Lesson</span></h1>
                    <p className="text-muted-foreground">Follow the simple steps to schedule your session.</p>
                </div>

                {/* Stepper */}
                <div className="flex gap-4">
                    {steps.map((step, i) => (
                        <div key={step} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${i <= currentStep ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'bg-muted text-muted-foreground'}`}>
                                {i < currentStep ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                            </div>
                            <span className={`hidden sm:block text-xs font-bold uppercase tracking-widest ${i <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>{step}</span>
                            {i < steps.length - 1 && <div className="hidden sm:block w-4 h-px bg-border" />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="relative pt-12">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {renderStepContent()}
                    </motion.div>
                </AnimatePresence>

                {currentStep > 0 && currentStep < 3 && (
                    <div className="flex justify-start pt-12">
                        <Button variant="outline" className="rounded-xl gap-2 h-12" onClick={handleBack}>
                            <ChevronLeft className="w-4 h-4" /> Previous Step
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
