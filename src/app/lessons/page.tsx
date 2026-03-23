'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, Clock, Shield, Star, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import CheckoutForm from '@/components/CheckoutForm'
import { useAuth } from '@/hooks/useAuth'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface LessonItem {
    id: string
    title: string
    description: string
    duration_minutes: number
    price: number
    features: string[]
    isPopular: boolean
    tag: string | null
    savings?: number
}

export default function LessonsPage() {
    const { user } = useAuth()
    const [individualLessons, setIndividualLessons] = useState<LessonItem[]>([])
    const [packages, setPackages] = useState<LessonItem[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPackage, setSelectedPackage] = useState<LessonItem | null>(null)
    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [isPurchaseComplete, setIsPurchaseComplete] = useState(false)
    const [isCheckingOut, setIsCheckingOut] = useState(false)

    useEffect(() => {
        fetchLessons()
    }, [])

    const fetchLessons = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('lessons')
                .select('*')
                .eq('is_active', true)
                .order('price', { ascending: true })

            if (error) throw error

            if (data) {
                const processed = data.map(lesson => ({
                    ...lesson,
                    features: lesson.features || [lesson.description || "High-quality instruction"],
                    isPopular: lesson.is_popular || false,
                    tag: lesson.tag || (lesson.title.includes('Pack') ? 'Value' : null)
                }))

                setIndividualLessons(processed.filter(l => !l.title.toLowerCase().includes('pack')))
                setPackages(processed.filter(l => l.title.toLowerCase().includes('pack')))
            }
        } catch (err) {
            console.error('Error fetching lessons:', err)
        } finally {
            setLoading(false)
        }
    }

    const handlePackagePurchase = async (pkg: LessonItem) => {
        if (!user) {
            window.location.href = `/signup?redirect=/lessons`
            return
        }

        setSelectedPackage(pkg)
        setIsCheckingOut(true)
        setClientSecret(null)
        setIsPurchaseComplete(false)

        try {
            const res = await fetch('/api/purchase-package', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packageId: pkg.id, studentId: user.id })
            })
            const data = await res.json()

            if (data.bypassStripe) {
                setIsPurchaseComplete(true)
                return
            } else if (data.clientSecret) {
                setClientSecret(data.clientSecret)
            } else if (data.error) {
                console.error('Stripe initialization failed:', data.error)
                alert('Payment gateway error. Please try again.')
                setIsCheckingOut(false)
            }
        } catch (err) {
            console.error('Error initiating package purchase:', err)
            alert('An unexpected error occurred.')
            setIsCheckingOut(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }
    return (
        <div className="pb-20 relative">
            {/* Purchase Modal Overlay */}
            <AnimatePresence>
                {isCheckingOut && selectedPackage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-card w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-border"
                        >
                            <div className="p-8 md:p-12 space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-bold font-outfit">Complete Purchase</h2>
                                        <p className="text-muted-foreground text-sm">{selectedPackage.title}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsCheckingOut(false)}
                                        className="rounded-full"
                                    >
                                        ✕
                                    </Button>
                                </div>

                                {isPurchaseComplete ? (
                                    <div className="text-center py-10 space-y-6 animate-in fade-in zoom-in">
                                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                            <Check className="w-10 h-10" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-bold font-outfit">Purchase Successful!</h3>
                                            <p className="text-muted-foreground">Your credits have been added to your account. You can now book your first lesson!</p>
                                        </div>
                                        <Link href="/book" className="block">
                                            <Button size="lg" className="w-full rounded-2xl h-14" onClick={() => setIsCheckingOut(false)}>
                                                Book Your First Lesson
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="p-6 bg-muted rounded-2xl flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white p-2 rounded-lg"><Zap className="w-4 h-4 text-accent" /></div>
                                                <span className="font-bold text-lg">${selectedPackage.price}</span>
                                            </div>
                                            <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{selectedPackage.duration_minutes / 60} Total Hours</span>
                                        </div>

                                        {clientSecret ? (
                                            <Elements stripe={stripePromise} options={{ clientSecret }}>
                                                <CheckoutForm amount={selectedPackage.price} onSuccess={() => setIsPurchaseComplete(true)} />
                                            </Elements>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                                <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                                                <p className="text-sm text-muted-foreground font-medium">Securing payment session...</p>
                                            </div>
                                        )}

                                        <p className="text-[10px] text-center text-muted-foreground uppercase tracking-wider font-bold">
                                            <Shield className="w-3 h-3 inline mr-1" /> Secure encrypted payment processed by Stripe
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <section className="bg-primary py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-outfit leading-tight"
                    >
                        Brisbane's Leading <br className="hidden md:block" /><span className="text-secondary italic">Car & Heavy Vehicle</span> Driving School
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-primary-foreground/80 max-w-2xl mx-auto text-lg leading-relaxed mt-4"
                    >
                        Great Heavy Driving School delivers a comprehensive range of standard Car (C Class) and Heavy Vehicle Driving Courses, including One-Day and Package Training for HR and MR. Flexible options designed to help you pass your test and drive with confidence.
                    </motion.p>
                </div>
            </section>

            {/* Individual Lessons */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="flex items-center gap-4 mb-12">
                    <div className="h-px bg-border flex-grow" />
                    <h2 className="text-2xl font-bold font-outfit px-4">Individual Lessons</h2>
                    <div className="h-px bg-border flex-grow" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {individualLessons.map((lesson, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ y: -10 }}
                            className={`p-8 rounded-3xl border ${lesson.isPopular ? 'border-accent ring-1 ring-accent bg-accent/5 shadow-xl' : 'border-border bg-card'} relative overflow-hidden`}
                        >
                            {lesson.isPopular && (
                                <div className="absolute top-4 right-4 bg-accent text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">
                                    Most Popular
                                </div>
                            )}
                            <h3 className="text-xl font-bold mb-2">{lesson.title}</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-3xl font-bold">${lesson.price}</span>
                                <span className="text-muted-foreground text-sm">/ {lesson.duration_minutes} mins</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                {lesson.features.map((feature: string) => (
                                    <li key={feature} className="flex items-start gap-3 text-sm text-foreground/80">
                                        <Check className="w-5 h-5 text-accent shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link href="/book">
                                <Button variant={lesson.isPopular ? 'accent' : 'outline'} className="w-full">Book This Lesson</Button>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Pricing Packages */}
            <section className="bg-muted/50 py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center space-y-4 mb-16">
                        <h2 className="text-accent font-bold tracking-widest uppercase text-sm">Bundle & Save</h2>
                        <p className="text-4xl font-bold font-outfit">Discounted Lesson Packages</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {packages.map((pkg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-primary rounded-3xl p-8 text-primary-foreground shadow-2xl space-y-8 relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Star className="w-24 h-24" />
                                </div>

                                <div className="space-y-2 relative">
                                    <span className="text-secondary text-xs font-bold uppercase tracking-widest">{pkg.tag}</span>
                                    <h3 className="text-2xl font-bold">{pkg.title}</h3>
                                    <p className="text-primary-foreground/60">{pkg.duration_minutes / 60} Total Hours</p>
                                </div>

                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-bold">${pkg.price}</span>
                                </div>
                                {pkg.savings && (
                                    <p className="text-secondary text-sm font-medium">Save ${pkg.savings} vs individual booking</p>
                                )}

                                <ul className="space-y-4 relative">
                                    {pkg.features.map((feature: string) => (
                                        <li key={feature} className="flex items-center gap-3 text-sm text-primary-foreground/80">
                                            <div className="p-0.5 bg-secondary/20 rounded-full">
                                                <Check className="w-4 h-4 text-secondary" />
                                            </div>
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button variant="secondary" className="w-full h-12" onClick={() => handlePackagePurchase(pkg)}>
                                    Buy Package Now
                                </Button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {[
                        { icon: <Clock />, title: "Flexible Times", desc: "Lessons available 7 days a week, from 7am to 8pm." },
                        { icon: <Zap />, title: "Fast Progress", desc: "Our structured curriculum helps you learn faster and safer." },
                        { icon: <Star />, title: "Mock Tests", desc: "Simulate real test conditions with our expert instructors." },
                        { icon: <Shield />, title: "Full Cover", desc: "All lessons are fully insured in our dual-controlled cars." }
                    ].map((feature, i) => (
                        <div key={i} className="space-y-4">
                            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                                {feature.icon}
                            </div>
                            <h4 className="font-bold text-lg">{feature.title}</h4>
                            <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}
