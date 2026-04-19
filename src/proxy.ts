import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Admin session guard
// ---------------------------------------------------------------------------
function checkAdminSession(request: NextRequest): NextResponse | null {
    const { pathname } = request.nextUrl
    if (pathname === '/admin/login') return null

    const adminSession = request.cookies.get('admin_session')?.value
    const expectedToken = Buffer.from(process.env.ADMIN_SECRET || '').toString('base64')

    if (!adminSession || adminSession !== expectedToken) {
        const loginUrl = new URL('/admin/login', request.url)
        return NextResponse.redirect(loginUrl)
    }
    return null
}

// ---------------------------------------------------------------------------
// Sliding-window rate limiter (in-memory, Node.js runtime)
// Not perfect across multiple instances but provides meaningful per-IP
// mitigation — combined with Vercel's network-level DDoS protection this
// is a solid baseline for a small site.
// ---------------------------------------------------------------------------
type WindowEntry = { count: number; windowStart: number }
const store = new Map<string, WindowEntry>()

// Purge stale entries every 500 requests to avoid unbounded growth
let purgeCounter = 0
function maybePurge(windowMs: number) {
    if (++purgeCounter < 500) return
    purgeCounter = 0
    const now = Date.now()
    for (const [key, val] of store) {
        if (now - val.windowStart > windowMs * 2) store.delete(key)
    }
}

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
    maybePurge(windowMs)
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || now - entry.windowStart > windowMs) {
        store.set(key, { count: 1, windowStart: now })
        return false
    }

    entry.count++
    if (entry.count > limit) return true
    return false
}

function getIP(request: NextRequest): string {
    return (
        request.headers.get('x-real-ip') ||
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        'unknown'
    )
}

// Route tiers — most restrictive first.
// Stripe webhook is exempt: Stripe handles its own retries and the
// signature check already rejects spoofed requests.
const TIERS: { pattern: RegExp; limit: number; windowMs: number; label: string }[] = [
    // Auth mutation endpoints — brute-force / credential stuffing targets
    {
        pattern: /^\/api\/auth\/(signup|signin|complete-profile)/,
        limit: 10,
        windowMs: 60_000,
        label: 'auth',
    },
    // Payment & booking creation — abuse would cost real money
    {
        pattern: /^\/api\/(create-payment-intent|purchase-package|book-lesson|booking\/notify)/,
        limit: 20,
        windowMs: 60_000,
        label: 'payment',
    },
    // All other public API routes
    {
        pattern: /^\/api\/(?!webhook\/stripe|admin)/,
        limit: 120,
        windowMs: 60_000,
        label: 'api',
    },
]

function rateLimitResponse(label: string, limit: number, windowMs: number): NextResponse {
    const res = NextResponse.json(
        { error: 'Too many requests. Please slow down and try again shortly.' },
        { status: 429 }
    )
    res.headers.set('Retry-After', String(Math.ceil(windowMs / 1000)))
    res.headers.set('X-RateLimit-Limit', String(limit))
    res.headers.set('X-RateLimit-Policy', label)
    return res
}

// ---------------------------------------------------------------------------
// Proxy entry point (Next.js 16+ — replaces middleware.ts)
// ---------------------------------------------------------------------------
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 1. Admin session guard
    if (pathname.startsWith('/admin')) {
        const redirect = checkAdminSession(request)
        if (redirect) return redirect
        return NextResponse.next()
    }

    // 2. Rate limiting for public API routes
    if (pathname.startsWith('/api/')) {
        const ip = getIP(request)

        for (const tier of TIERS) {
            if (tier.pattern.test(pathname)) {
                const key = `${tier.label}:${ip}`
                if (isRateLimited(key, tier.limit, tier.windowMs)) {
                    console.warn(`[rate-limit] ${tier.label} limit hit — IP: ${ip} PATH: ${pathname}`)
                    return rateLimitResponse(tier.label, tier.limit, tier.windowMs)
                }
                break // only apply the first matching tier
            }
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/admin',
        '/admin/:path*',
        '/api/:path*',
    ],
}
