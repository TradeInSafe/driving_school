'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, Phone, MapPin, Car } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export const Footer = () => {
    const [logoUrl, setLogoUrl] = useState<string | null>(null)

    useEffect(() => {
        const fetchLogo = async () => {
            const { data } = await supabase.from('settings').select('value').eq('key', 'logo_url').single()
            if (data?.value) setLogoUrl(data.value)
        }
        fetchLogo()
    }, [])

    return (
        <footer className="bg-primary text-primary-foreground pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Brisbane Bayside Driving School Footer" className="h-10 object-contain brightness-0 invert" />
                            ) : (
                                <>
                                    <div className="bg-secondary p-2 rounded-lg">
                                        <Car className="text-primary w-6 h-6" />
                                    </div>
                                    <span className="text-xl font-bold tracking-tight">
                                        Brisbane Bayside <span className="text-secondary">Driving School</span>
                                    </span>
                                </>
                            )}
                        </div>
                        <p className="text-primary-foreground/70 leading-relaxed max-w-xs">
                            Empowering new drivers with confidence and skills for a lifetime of safe driving. Modern lessons for the modern world.
                        </p>
                        <div className="flex gap-4 items-center">
                            <a href="https://www.facebook.com/profile.php?id=61577753661994" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                                <img src="/facebook.png" alt="Facebook" className="w-8 h-8 object-contain" />
                            </a>
                            <a href="https://www.instagram.com/brisbanebaysidedriving" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                                <img src="/instagram.png" alt="Instagram" className="w-8 h-8 object-contain" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold">Quick Links</h3>
                        <ul className="space-y-4">
                            {['Home', 'About Us', 'Lessons', 'Packages', 'Testimonials'].map((link) => (
                                <li key={link}>
                                    <Link href={`/${link.toLowerCase().replace(' ', '-')}`} className="text-primary-foreground/70 hover:text-secondary transition-colors">
                                        {link}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Services */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold">Services</h3>
                        <ul className="space-y-4">
                            {['Individual Lessons', 'Intensive Courses', 'Mock Driving Tests', 'Refresher Courses', 'Theory Test Prep'].map((service) => (
                                <li key={service} className="text-primary-foreground/70">
                                    {service}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold">Contact Info</h3>
                        <ul className="space-y-4">
                            <li className="flex gap-3 text-primary-foreground/70">
                                <MapPin className="w-5 h-5 text-secondary shrink-0" />
                                <a href="https://maps.app.goo.gl/P4cuRBgEKfDTH1i26" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">13 Lawson St, Capalaba QLD 4157</a>
                            </li>
                            <li className="flex gap-3 text-primary-foreground/70">
                                <Phone className="w-5 h-5 text-secondary shrink-0" />
                                <a href="tel:0470252770" className="hover:text-secondary transition-colors">0470 252 770</a>
                            </li>
                            <li className="flex gap-3 text-primary-foreground/70">
                                <Mail className="w-5 h-5 text-secondary shrink-0" />
                                <a href="mailto:brisbanebaysidedrivingschool@gmail.com" className="hover:text-secondary transition-colors">brisbanebaysidedrivingschool@gmail.com</a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-20 pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-primary-foreground/50 text-sm">
                        © {new Date().getFullYear()} Brisbane Bayside Driving School. All rights reserved.
                    </p>
                    <div className="flex gap-8 text-sm text-primary-foreground/50">
                        <a href="#" className="hover:text-secondary transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-secondary transition-colors">Terms of Service</a>
                    </div>
                </div>
            </div>
        </footer>
    )
}
