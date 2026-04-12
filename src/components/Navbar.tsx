'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react'
import { Button } from './ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase' // used for public settings fetch only

const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'About Us', href: '/about' },
    { name: 'Lessons', href: '/lessons' },
    { name: 'Testimonials', href: '/testimonials' },
    { name: 'Contact', href: '/contact' },
]

export const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [isScrolled, setIsScrolled] = useState(false)
    const [showProfileMenu, setShowProfileMenu] = useState(false)
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const { user, profile, signOut } = useAuth()

    useEffect(() => {
        const fetchLogo = async () => {
            const { data } = await supabase.from('settings').select('value').eq('key', 'logo_url').single()
            if (data?.value) setLogoUrl(data.value)
        }
        fetchLogo()

        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const getDashboardLink = () => '/dashboard'

    return (
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white py-3 shadow-sm' : 'bg-white py-5'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3">
                        <img
                            src={logoUrl || '/drivingschool_logo.avif'}
                            alt="Brisbane Bayside Driving School"
                            className="h-18 object-contain"
                        />
                        <span className="text-xl font-bold tracking-tight text-primary">
                            Brisbane Bayside <span className="text-accent">Driving School</span>
                        </span>
                    </Link>

                    {/* Desktop Links */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-sm font-medium text-foreground/80 hover:text-accent transition-colors"
                            >
                                {link.name}
                            </Link>
                        ))}

                        <div className="flex items-center gap-2">
                            <a href="https://www.facebook.com/profile.php?id=61577753661994" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
                                <img src="/facebook.png" alt="Facebook" className="w-6 h-6 object-contain" />
                            </a>
                            <a href="https://www.instagram.com/brisbanebaysidedriving" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
                                <img src="/instagram.png" alt="Instagram" className="w-6 h-6 object-contain" />
                            </a>
                        </div>
                        <div className="flex items-center gap-4 border-l pl-8 border-border">
                            {user ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                                        className="flex items-center gap-2 p-1 rounded-full border border-border hover:bg-muted transition-colors"
                                    >
                                        <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium pr-2">{profile?.full_name?.split(' ')[0] || 'User'}</span>
                                    </button>

                                    {showProfileMenu && (
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-border rounded-xl shadow-xl py-2 animate-in fade-in slide-in-from-top-2">
                                            <Link href={getDashboardLink()} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted" onClick={() => setShowProfileMenu(false)}>
                                                <LayoutDashboard className="w-4 h-4" /> Dashboard
                                            </Link>
                                            <Link href="/profile" className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted" onClick={() => setShowProfileMenu(false)}>
                                                <User className="w-4 h-4" /> Profile
                                            </Link>
                                            <button
                                                onClick={() => { signOut(); setShowProfileMenu(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted text-red-500"
                                            >
                                                <LogOut className="w-4 h-4" /> Sign Out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <Link href="/signin">
                                        <Button variant="ghost" size="sm">Sign In</Button>
                                    </Link>
                                    <Link href="/book">
                                        <Button variant="secondary" size="sm">Book Now</Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Mobile Toggle */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 text-foreground/80 hover:text-primary transition-colors"
                        >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden absolute top-full left-0 w-full glass shadow-xl border-t border-border animate-in fade-in slide-in-from-top-4">
                    <div className="px-4 pt-4 pb-6 space-y-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="block px-3 py-3 text-base font-medium text-foreground/80 hover:text-accent hover:bg-primary/5 rounded-md"
                                onClick={() => setIsOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="pt-4 border-t border-border space-y-3">
                            {user ? (
                                <>
                                    <Link href={getDashboardLink()} className="block" onClick={() => setIsOpen(false)}>
                                        <Button variant="ghost" className="w-full justify-start gap-3">
                                            <LayoutDashboard className="w-4 h-4" /> Dashboard
                                        </Button>
                                    </Link>
                                    <Link href="/profile" className="block" onClick={() => setIsOpen(false)}>
                                        <Button variant="ghost" className="w-full justify-start gap-3">
                                            <User className="w-4 h-4" /> Profile
                                        </Button>
                                    </Link>
                                    <Button variant="ghost" className="w-full justify-start gap-3 text-red-500" onClick={() => { signOut(); setIsOpen(false); }}>
                                        <LogOut className="w-4 h-4" /> Sign Out
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Link href="/signin" className="block" onClick={() => setIsOpen(false)}>
                                        <Button variant="ghost" className="w-full justify-start">Sign In</Button>
                                    </Link>
                                    <Link href="/book" className="block" onClick={() => setIsOpen(false)}>
                                        <Button variant="secondary" className="w-full">Book Now</Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}
