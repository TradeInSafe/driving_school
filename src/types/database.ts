export type Role = 'student' | 'instructor' | 'admin'

export interface Profile {
    id: string
    full_name: string
    avatar_url?: string
    role: Role
    bio?: string
    rating?: number
    experience_years?: number
    car_model?: string
    languages?: string[]
    credits_remaining?: number
    package_expiry?: string
    updated_at: string
}

export interface Instructor {
    id: string
    bio: string
    experience_years: number
    rating: number
    profile?: Profile
}

export interface Lesson {
    id: string
    title: string
    description: string
    price: number
    duration_minutes: number
    is_active?: boolean
    is_package?: boolean
    package_credits?: number
}

export interface Package {
    id: string
    title: string
    description: string
    lesson_count: number
    price: number
}

export interface Booking {
    id: string
    student_id: string
    instructor_id: string
    lesson_id: string
    package_id?: string
    end_time: string
    status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
    payment_status: 'pending' | 'paid' | 'refunded'
    pickup_address?: string
    transmission_type?: 'auto' | 'manual'
    credits_used: number
    created_at: string
}

export interface Availability {
    id: string
    instructor_id: string
    day_of_week: number // 0-6
    start_time: string // HH:mm
    end_time: string // HH:mm
}
