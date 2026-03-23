'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

export default function ContactPage() {
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [isSubmitted, setIsSubmitted] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const data = {
            full_name: formData.get('full_name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            interest: formData.get('interest') as string,
            message: formData.get('message') as string,
        }

        try {
            const { error: submitError } = await supabase
                .from('inquiries')
                .insert([data])

            if (submitError) throw submitError

            setIsSubmitted(true)
            e.currentTarget.reset()
        } catch (err: any) {
            console.error('Submission error:', err.message)
            setError('Failed to send message. Please try again or call us directly.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="pb-20">
            {/* Header */}
            <section className="bg-primary py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-bold text-white font-outfit"
                    >
                        Get In <span className="text-secondary italic">Touch</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-primary-foreground/70 max-w-2xl mx-auto text-lg"
                    >
                        Have questions about our lessons or packages? We're here to help you get started on your driving journey.
                    </motion.p>
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* Contact Info & Info */}
                    <div className="space-y-12">
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold font-outfit">Contact Information</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Reach out to us through any of these channels. Our team is available to assist you with bookings and enquiries during business hours.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            {[
                                { icon: <Phone className="w-5 h-5" />, title: "Phone", detail: "+61 400 000 000" },
                                { icon: <Mail className="w-5 h-5" />, title: "Email", detail: "info@brisbanebaysidedrivingschool.com" },
                                { icon: <MapPin className="w-5 h-5" />, title: "Location", detail: "Brisbane, QLD 4000" },
                                { icon: <Clock className="w-5 h-5" />, title: "Hours", detail: "Mon-Sun: 7am - 8pm" }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 p-6 bg-muted rounded-2xl border border-border group hover:bg-white transition-colors duration-300">
                                    <div className="bg-accent/10 p-3 rounded-xl text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm tracking-wide uppercase text-foreground/60">{item.title}</h4>
                                        <p className="font-bold">{item.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Map Placeholder */}
                        <div className="aspect-video bg-muted rounded-[2rem] border border-border relative overflow-hidden group shadow-inner">
                            <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v10/static/153.0251,-27.4698,12,0/800x450?access_token=pk.eyJ1IjoiYXIyOTAiLCJhIjoiY2p3cjR0cm9mMGp5bjQ0cGt4bmh3dzB4ciJ9.5-z5V5_5_5_v5_5_5_v5w')] bg-cover opacity-50 grayscale group-hover:grayscale-0 transition-all duration-500" />
                            <div className="absolute inset-0 flex items-center justify-center p-12 text-center bg-black/5">
                                <div className="bg-white/90 backdrop-blur px-8 py-4 rounded-full shadow-2xl border border-white/50">
                                    <p className="font-bold text-primary flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-accent" /> Brisbane HQ
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-card border border-border p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <MessageSquare className="w-32 h-32 text-primary" />
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold font-outfit">Send a Message</h3>
                                <p className="text-sm text-muted-foreground">Fill out the form below and one of our instructors will get back to you within 24 hours.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Full Name</label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        required
                                        placeholder="Jane Doe"
                                        className="w-full bg-muted border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-accent transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        placeholder="jane@example.com"
                                        className="w-full bg-muted border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-accent transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="+61 400 000 000"
                                        className="w-full bg-muted border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-accent transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Interest</label>
                                    <select
                                        name="interest"
                                        className="w-full bg-muted border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-accent transition-all outline-none appearance-none"
                                    >
                                        <option value="General Enquiry">General Enquiry</option>
                                        <option value="Lesson Packages">Lesson Packages</option>
                                        <option value="Instructor Availability">Instructor Availability</option>
                                        <option value="Booking Help">Booking Help</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold uppercase tracking-wider text-foreground/60 px-1">Your Message</label>
                                <textarea
                                    name="message"
                                    rows={5}
                                    required
                                    placeholder="How can we help you?"
                                    className="w-full bg-muted border-none rounded-xl px-5 py-4 focus:ring-2 focus:ring-accent transition-all outline-none resize-none"
                                />
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100"
                                >
                                    {error}
                                </motion.div>
                            )}

                            {isSubmitted ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-green-50 text-green-700 p-8 rounded-3xl border border-green-100 text-center space-y-4"
                                >
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-xl font-bold font-outfit">Message Sent!</h4>
                                        <p className="text-sm opacity-80 text-green-800">Thank you for reaching out. We'll get back to you shortly.</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="border-green-200 text-green-700 hover:bg-green-100"
                                        onClick={() => setIsSubmitted(false)}
                                    >
                                        Send Another Message
                                    </Button>
                                </motion.div>
                            ) : (
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full h-14 rounded-xl gap-3 shadow-xl hover:shadow-accent/20 transition-all font-bold"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Sending...' : 'Send Message'} <Send className="w-5 h-5" />
                                </Button>
                            )}
                        </form>
                    </motion.div>
                </div>
            </section>
        </div>
    )
}
