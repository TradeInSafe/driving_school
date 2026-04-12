'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Award, Users, Target, CheckCircle2, User } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface Instructor {
    id: string
    full_name: string
    bio: string | null
    experience_years: number
    photo_url: string | null
    rating: number
}

export default function AboutPage() {
    const [instructors, setInstructors] = useState<Instructor[]>([])

    useEffect(() => {
        supabase
            .from('instructors')
            .select('id, full_name, bio, experience_years, photo_url, rating')
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .then(({ data }) => { if (data) setInstructors(data) })
    }, [])
    return (
        <div className="pb-20">
            {/* Hero Section */}
            <section className="bg-primary py-24 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl lg:text-7xl font-bold text-white font-outfit leading-tight"
                    >
                        Brisbane's Leading <span className="text-secondary italic">Car & Heavy Vehicle</span> Driving School
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-primary-foreground/80 max-w-3xl mx-auto text-xl leading-relaxed mt-4"
                    >
                        Great Heavy Driving School delivers a comprehensive range of standard Car (C Class) and Heavy Vehicle Driving Courses, including One-Day and Package Training for HR and MR vehicles.
                    </motion.p>
                </div>
            </section>

            {/* Our Story */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div className="relative h-96 md:h-full min-h-[400px] rounded-[3rem] overflow-hidden shadow-2xl">
                        <Image
                            src="/brisbane_driving_truck.jpeg"
                            alt="Brisbane's Leading Heavy Vehicle Driving School"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="space-y-6">
                        <h2 className="text-accent font-bold tracking-widest uppercase text-sm">Our Story</h2>
                        <h3 className="text-4xl font-bold font-outfit">Empowering Drivers for Every Vehicle Class</h3>
                        <p className="text-muted-foreground leading-relaxed text-lg pt-4">
                            At <span className="font-bold text-primary">Great Heavy Driving School</span>, we provide an all-inclusive training experience. Whether you're a beginner wanting to earn your P-plates in a standard car, or a professional seeking an HR (Heavy Rigid) or MR (Medium Rigid) commercial license, we have a tailored course designed precisely for you.
                        </p>
                        <p className="text-muted-foreground leading-relaxed text-lg">
                            We don't just teach you to pass your test—we equip you with the practical skills, road awareness, and confidence needed to safely operate anything from a small car to a massive commercial truck on Australia's most demanding road networks.
                        </p>
                    </div>
                </div>
            </section>

            {/* Our Values */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <h2 className="text-accent font-bold tracking-widest uppercase text-sm">Our values</h2>
                        <p className="text-4xl font-bold font-outfit">What Makes Us Different</p>
                        <div className="space-y-6">
                            {[
                                { title: "Personalized Coaching", desc: "Every student learns differently. We adapt our teaching style to match yours." },
                                { title: "Modern Techniques", desc: "We use the latest safety standards and dual-controlled vehicles." },
                                { title: "Transparent Progress", desc: "Track every milestone through our digital student dashboard." }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 p-6 bg-muted rounded-2xl border border-border">
                                    <CheckCircle2 className="w-6 h-6 text-accent shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-lg">{item.title}</h4>
                                        <p className="text-muted-foreground">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <div className="aspect-square bg-secondary rounded-[3rem] relative overflow-hidden shadow-2xl">
                            <div className="absolute inset-4 bg-primary/10 rounded-[2.5rem] border-2 border-dashed border-primary/20" />
                            <div className="absolute inset-0 flex items-center justify-center p-12 text-primary">
                                <Shield className="w-full h-full opacity-20" />
                            </div>
                            <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/50">
                                <p className="font-bold text-xl mb-1">Pass on 1st Attempt</p>
                                <p className="text-accent font-bold">92% Rate in 2025</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Instructors */}
            <section className="bg-muted/50 py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center space-y-4 mb-16">
                        <h2 className="text-accent font-bold tracking-widest uppercase text-sm">Meet the experts</h2>
                        <p className="text-4xl font-bold font-outfit">Your Professional Instructors</p>
                    </div>

                    {instructors.length === 0 ? (
                        <p className="text-center text-muted-foreground">Instructor profiles coming soon.</p>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {instructors.map((instructor, i) => (
                            <motion.div
                                key={instructor.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="group"
                            >
                                <div className="aspect-square rounded-[2rem] overflow-hidden mb-8 shadow-lg ring-1 ring-border bg-muted flex items-center justify-center">
                                    {instructor.photo_url ? (
                                        <img
                                            src={instructor.photo_url}
                                            alt={instructor.full_name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <User className="w-16 h-16 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-2xl font-bold font-outfit">{instructor.full_name}</h3>
                                        {instructor.experience_years > 0 && (
                                            <span className="bg-secondary text-primary font-bold text-[10px] px-2 py-1 rounded lowercase tracking-tight">{instructor.experience_years}+ yrs</span>
                                        )}
                                    </div>
                                    {instructor.bio && (
                                        <p className="text-muted-foreground leading-relaxed pt-2">{instructor.bio}</p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    )}
                </div>
            </section>

            {/* Mission/Award Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { icon: <Award className="w-10 h-10" />, title: "Best Rated 2024", desc: "Recognized as the top-performing driving school in the Brisbane Metro area." },
                        { icon: <Target className="w-10 h-10" />, title: "Focused Learning", desc: "Curriculum designed around the latest QLD Transport test requirements." },
                        { icon: <Users className="w-10 h-10" />, title: "Inclusive Environment", desc: "We welcome all backgrounds and provide a supportive learning space." }
                    ].map((stat, i) => (
                        <div key={i} className="text-center space-y-6 p-8 bg-card border border-border rounded-3xl group hover:border-accent transition-colors">
                            <div className="inline-flex p-4 bg-accent/10 rounded-2xl text-accent group-hover:bg-accent group-hover:text-white transition-all duration-300">
                                {stat.icon}
                            </div>
                            <h4 className="text-xl font-bold font-outfit">{stat.title}</h4>
                            <p className="text-muted-foreground">{stat.desc}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}
