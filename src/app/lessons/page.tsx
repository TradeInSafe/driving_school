'use client'

import { motion } from 'framer-motion'
import { Check, Clock, Shield, Star, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

interface LessonItem {
    id: string
    title: string
    description: string
    duration_minutes: number
    price: number
    lesson_count: number
    features: string[]
    isPopular: boolean
    tag: string | null
    savings?: number
}

interface HireItem {
    id: string
    title: string
    description: string
    vehicle_type: string
    duration_minutes: number
    price: number
    is_active: boolean
}

export default function LessonsPage() {
    const [individualLessons, setIndividualLessons] = useState<LessonItem[]>([])
    const [packages, setPackages] = useState<LessonItem[]>([])
    const [hires, setHires] = useState<HireItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchLessons()
    }, [])

    const fetchLessons = async () => {
        setLoading(true)
        try {
            const [{ data: lessonsData, error }, { data: hiresData }] = await Promise.all([
                supabase.from('lessons').select('*').eq('is_active', true).order('price', { ascending: true }),
                supabase.from('vehicle_hires').select('*').eq('is_active', true).order('price', { ascending: true }),
            ])

            if (error) throw error

            if (lessonsData) {
                const processed = lessonsData.map(lesson => ({
                    ...lesson,
                    features: lesson.features || [lesson.description || "High-quality instruction"],
                    isPopular: lesson.is_popular || false,
                    tag: lesson.tag || (lesson.is_package ? 'Bundle' : null)
                }))

                setIndividualLessons(processed.filter(l => !l.is_package))
                setPackages(processed.filter(l => l.is_package))
            }

            if (hiresData) setHires(hiresData)
        } catch (err) {
            console.error('Error fetching lessons:', err)
        } finally {
            setLoading(false)
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
                            <Link href={`/book?lessonId=${lesson.id}`}>
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
                                    <p className="text-primary-foreground/60">
                                        {pkg.lesson_count} × {pkg.duration_minutes / pkg.lesson_count} min sessions
                                        &nbsp;·&nbsp; {pkg.duration_minutes / 60} hrs total
                                    </p>
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

                                <Link href={`/book?lessonId=${pkg.id}`} className="block">
                                    <Button variant="secondary" className="w-full h-12">
                                        Book Package Now
                                    </Button>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Vehicle Hire for Test */}
            {hires.length > 0 && (
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="h-px bg-border flex-grow" />
                        <h2 className="text-2xl font-bold font-outfit px-4">Hire a Vehicle for Your Test</h2>
                        <div className="h-px bg-border flex-grow" />
                    </div>
                    <p className="text-center text-muted-foreground text-sm mb-12 max-w-xl mx-auto">
                        Already confident behind the wheel? Hire one of our dual-controlled vehicles for your practical driving test. An instructor accompaniment is optional.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {hires.map((hire, i) => (
                            <motion.div
                                key={hire.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-8 rounded-3xl border border-border bg-card hover:border-accent/40 hover:shadow-lg transition-all space-y-4"
                            >
                                <div className="bg-accent/10 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl">
                                    {hire.vehicle_type === 'truck' ? '🚛' : '🚗'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{hire.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{hire.description}</p>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold">${hire.price}</span>
                                    <span className="text-muted-foreground text-sm">/ {hire.duration_minutes} mins</span>
                                </div>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-accent shrink-0" /> Dual-controlled vehicle</li>
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-accent shrink-0" /> Instructor accompaniment optional</li>
                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-accent shrink-0" /> Fully insured</li>
                                </ul>
                                <Link href={`/book?mode=hire&hireId=${hire.id}`}>
                                    <Button variant="outline" className="w-full mt-2">Hire for Test</Button>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

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
