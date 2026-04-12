'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'

export interface AuthUser {
    id: string
    email: string
    full_name: string | null
    phone: string | null
    address: string | null
    gender: string | null
    license_number: string | null
    license_expiry: string | null
}

interface AuthContextType {
    user: AuthUser | null
    profile: AuthUser | null // alias of user for backward compatibility
    loading: boolean
    signOut: () => Promise<void>
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    refreshUser: async () => { },
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/me')
            if (res.ok) {
                const { user } = await res.json()
                setUser(user)
            } else {
                setUser(null)
            }
        } catch {
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUser()
    }, [])

    const signOut = async () => {
        await fetch('/api/auth/signout', { method: 'POST' })
        setUser(null)
        router.push('/signin')
    }

    return (
        <AuthContext.Provider value={{ user, profile: user, loading, signOut, refreshUser: fetchUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
