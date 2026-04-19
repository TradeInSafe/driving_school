'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Phone, MapPin, Clock, Mail } from 'lucide-react'

export default function ContactPage() {
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

            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-12">
                {/* Contact Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[
                        {
                            icon: <Phone className="w-6 h-6" />,
                            title: "Phone",
                            detail: "0470 252 770",
                            href: "tel:0470252770"
                        },
                        {
                            icon: <Mail className="w-6 h-6" />,
                            title: "Email",
                            detail: "brisbanebaysidedrivingschool@gmail.com",
                            href: "mailto:brisbanebaysidedrivingschool@gmail.com"
                        },
                        {
                            icon: <MapPin className="w-6 h-6" />,
                            title: "Address",
                            detail: "13 Lawson St, Capalaba QLD 4157",
                            href: "https://maps.app.goo.gl/P4cuRBgEKfDTH1i26"
                        },
                        {
                            icon: <Clock className="w-6 h-6" />,
                            title: "Hours",
                            detail: "Mon – Sun: 7am – 8pm",
                            href: null
                        },
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex gap-4 p-6 bg-muted rounded-2xl border border-border group hover:bg-white transition-colors duration-300"
                        >
                            <div className="bg-accent/10 p-3 rounded-xl text-accent group-hover:bg-accent group-hover:text-white transition-colors shrink-0 h-fit">
                                {item.icon}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm tracking-wide uppercase text-foreground/60 mb-1">{item.title}</h4>
                                {item.href ? (
                                    <a href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="font-bold hover:text-accent transition-colors">{item.detail}</a>
                                ) : (
                                    <p className="font-bold">{item.detail}</p>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Google Maps Embed */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-[2rem] overflow-hidden border border-border shadow-lg"
                >
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3538.3!2d153.178!3d-27.533!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6b9147b6b6b6b6b6%3A0x0!2s13+Lawson+St%2C+Capalaba+QLD+4157!5e0!3m2!1sen!2sau!4v1"
                        width="100%"
                        height="450"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Brisbane Bayside Driving School location"
                    />
                </motion.div>

                {/* Direct link */}
                <div className="text-center">
                    <a
                        href="https://maps.app.goo.gl/P4cuRBgEKfDTH1i26"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-accent font-semibold hover:underline"
                    >
                        <MapPin className="w-4 h-4" /> Open in Google Maps
                    </a>
                </div>
            </section>
        </div>
    )
}
