'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Star, Quote, CheckCircle, Smartphone, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

const googleReviews = [
    { name: "Emily Rogers", date: "2 days ago", rating: 5, comment: "Professional, patient, and really helped me overcome my fear of highways. Highly recommend!", avatar: "https://i.pravatar.cc/100?img=32" },
    { name: "Michael Chang", date: "1 week ago", rating: 5, comment: "The online booking system is a game changer. Passed my test first try with John. Five stars!", avatar: "https://i.pravatar.cc/100?img=13" },
    { name: "Sarah Jenkins", date: "2 weeks ago", rating: 5, comment: "Very reasonably priced packages. The instructors are experts and know all the local test routes.", avatar: "https://i.pravatar.cc/100?img=45" },
    { name: "Brooke Smith", date: "3 weeks ago", rating: 4, comment: "Great instructors. Helped me get my manual license without any stress. Very clear instructions.", avatar: "https://i.pravatar.cc/100?img=22" },
    { name: "Liam O'Connor", date: "1 month ago", rating: 5, comment: "I tried two other schools before finding Brisbane Bayside. The difference in teaching quality is huge.", avatar: "https://i.pravatar.cc/100?img=15" },
    { name: "Sophia Garcia", date: "1 month ago", rating: 5, comment: "Excellent experience. Flexible timing helped me fit lessons around my work schedule perfectly.", avatar: "https://i.pravatar.cc/100?img=28" }
]

export default function TestimonialsPage() {
    return (
        <div className="pb-20">
            {/* Header */}
            <section className="bg-primary py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
                    <div className="flex justify-center -space-x-4 mb-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="w-14 h-14 rounded-full border-4 border-primary bg-muted overflow-hidden">
                                <img src={`https://i.pravatar.cc/100?img=${i + 20}`} alt="Student" />
                            </div>
                        ))}
                    </div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-bold text-white font-outfit"
                    >
                        What Our <span className="text-secondary italic">Students</span> Say
                    </motion.h1>
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Star key={i} className="w-6 h-6 text-secondary fill-secondary" />
                            ))}
                        </div>
                        <p className="text-primary-foreground/70 text-lg">4.9 / 5.0 based on 500+ Verified Google Reviews</p>
                    </div>
                </div>
            </section>

            {/* Reviews Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
                    {googleReviews.map((review, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: (i % 3) * 0.1 }}
                            className="break-inside-avoid bg-card border border-border p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 relative group"
                        >
                            <Quote className="absolute top-6 right-8 w-12 h-12 text-muted opacity-20 group-hover:text-accent group-hover:opacity-10 transition-colors" />
                            <div className="flex items-center gap-4 mb-6">
                                <img src={review.avatar} alt={review.name} className="w-12 h-12 rounded-full border border-border" />
                                <div>
                                    <h4 className="font-bold">{review.name}</h4>
                                    <p className="text-xs text-muted-foreground">{review.date}</p>
                                </div>
                            </div>
                            <div className="flex gap-1 mb-4">
                                {[...Array(5)].map((_, idx) => (
                                    <Star key={idx} className={`w-4 h-4 ${idx < review.rating ? 'text-secondary fill-secondary' : 'text-muted fill-muted'}`} />
                                ))}
                            </div>
                            <p className="text-foreground/80 leading-relaxed italic">
                                "{review.comment}"
                            </p>
                            <div className="mt-6 pt-4 border-t border-border flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-widest">
                                <CheckCircle className="w-4 h-4" /> Verified Google Review
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Stats/Badge Section */}
            <section className="bg-muted py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-[3rem] p-12 md:p-20 shadow-2xl border border-border flex flex-col md:flex-row items-center gap-16">
                        <div className="md:w-1/3 flex justify-center">
                            <div className="w-48 h-48 bg-secondary rounded-full flex items-center justify-center p-8 relative">
                                <div className="absolute inset-2 border-2 border-dashed border-primary/20 rounded-full animate-spin-slow" />
                                <Star className="w-full h-full text-primary" />
                            </div>
                        </div>
                        <div className="md:w-2/3 space-y-8">
                            <h3 className="text-4xl font-bold font-outfit">The Gold Standard in Driver Education</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-primary font-bold">
                                        <Smartphone className="w-5 h-5 text-accent" /> Digital Tracking
                                    </div>
                                    <p className="text-muted-foreground text-sm">Every lesson is logged digitally so you can see your progress in real-time.</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-primary font-bold">
                                        <Star className="w-5 h-5 text-accent" /> Premium Fleet
                                    </div>
                                    <p className="text-muted-foreground text-sm">Learn in our modern, well-maintained vehicles for maximum safety.</p>
                                </div>
                            </div>
                            <Link href="/book" className="inline-block">
                                <Button size="lg" className="rounded-2xl gap-2">Book Your Success Story <ArrowRight className="w-5 h-5" /></Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
