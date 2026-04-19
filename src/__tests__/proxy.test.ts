/**
 * Rate-limit and admin-guard tests for src/proxy.ts
 *
 * The module-level `store` Map persists across calls within a test run, so
 * every test uses a unique IP (via `x-real-ip`) to avoid state bleed.
 *
 * Window-reset tests use vi.useFakeTimers() so we can advance Date.now()
 * without actually sleeping.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '../proxy'

// ─── helpers ──────────────────────────────────────────────────────────────────

let ipCounter = 0
function uniqueIP() {
    ipCounter++
    return `10.0.${Math.floor(ipCounter / 255)}.${ipCounter % 255 || 1}`
}

function makeRequest(pathname: string, ip: string, cookies: Record<string, string> = {}): NextRequest {
    const url = `http://localhost${pathname}`
    const cookieHeader = Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ')
    const headers: Record<string, string> = { 'x-real-ip': ip }
    if (cookieHeader) headers['cookie'] = cookieHeader
    return new NextRequest(url, { headers })
}

/**
 * Send `n` requests to `pathname` from `ip`, returning the last response.
 */
async function hit(pathname: string, ip: string, n: number) {
    let res: ReturnType<typeof proxy> | undefined
    for (let i = 0; i < n; i++) {
        res = proxy(makeRequest(pathname, ip))
    }
    return res!
}

// ─── setup ────────────────────────────────────────────────────────────────────

beforeAll(() => {
    process.env.ADMIN_SECRET = 'test-secret'
})

afterAll(() => {
    vi.useRealTimers()
})

// ─── Auth tier (10 req / 60 s) ────────────────────────────────────────────────

describe('auth tier — /api/auth/signin', () => {
    const path = '/api/auth/signin'

    it('allows the first 10 requests', async () => {
        const ip = uniqueIP()
        const res = await hit(path, ip, 10)
        expect((res as Response).status).not.toBe(429)
    })

    it('blocks the 11th request with 429', async () => {
        const ip = uniqueIP()
        await hit(path, ip, 10)
        const res = proxy(makeRequest(path, ip)) as Response
        expect(res.status).toBe(429)
    })

    it('sets Retry-After: 60 on the 429 response', async () => {
        const ip = uniqueIP()
        await hit(path, ip, 10)
        const res = proxy(makeRequest(path, ip)) as Response
        expect(res.headers.get('Retry-After')).toBe('60')
    })

    it('sets X-RateLimit-Limit: 10', async () => {
        const ip = uniqueIP()
        await hit(path, ip, 10)
        const res = proxy(makeRequest(path, ip)) as Response
        expect(res.headers.get('X-RateLimit-Limit')).toBe('10')
    })

    it('sets X-RateLimit-Policy: auth', async () => {
        const ip = uniqueIP()
        await hit(path, ip, 10)
        const res = proxy(makeRequest(path, ip)) as Response
        expect(res.headers.get('X-RateLimit-Policy')).toBe('auth')
    })

    it('resets after the window expires', async () => {
        vi.useFakeTimers()
        const ip = uniqueIP()
        await hit(path, ip, 10)
        // Window is 60 000 ms — advance past it
        vi.advanceTimersByTime(61_000)
        const res = proxy(makeRequest(path, ip)) as Response
        expect(res.status).not.toBe(429)
        vi.useRealTimers()
    })
})

describe('auth tier — /api/auth/signup', () => {
    it('blocks after 10 requests', async () => {
        const ip = uniqueIP()
        await hit('/api/auth/signup', ip, 10)
        const res = proxy(makeRequest('/api/auth/signup', ip)) as Response
        expect(res.status).toBe(429)
        expect(res.headers.get('X-RateLimit-Policy')).toBe('auth')
    })
})

describe('auth tier — /api/auth/complete-profile', () => {
    it('blocks after 10 requests', async () => {
        const ip = uniqueIP()
        await hit('/api/auth/complete-profile', ip, 10)
        const res = proxy(makeRequest('/api/auth/complete-profile', ip)) as Response
        expect(res.status).toBe(429)
        expect(res.headers.get('X-RateLimit-Policy')).toBe('auth')
    })
})

// ─── Payment tier (20 req / 60 s) ─────────────────────────────────────────────

describe('payment tier', () => {
    const paths = [
        '/api/create-payment-intent',
        '/api/purchase-package',
        '/api/book-lesson',
        '/api/booking/notify',
    ]

    for (const path of paths) {
        it(`allows 20 and blocks 21st for ${path}`, async () => {
            const ip = uniqueIP()
            await hit(path, ip, 20)
            const res = proxy(makeRequest(path, ip)) as Response
            expect(res.status).toBe(429)
            expect(res.headers.get('X-RateLimit-Policy')).toBe('payment')
            expect(res.headers.get('X-RateLimit-Limit')).toBe('20')
        })
    }
})

// ─── General API tier (120 req / 60 s) ────────────────────────────────────────

describe('general api tier', () => {
    it('allows 120 requests to /api/lessons', async () => {
        const ip = uniqueIP()
        const res = await hit('/api/lessons', ip, 120)
        expect((res as Response).status).not.toBe(429)
    })

    it('blocks the 121st request to /api/lessons', async () => {
        const ip = uniqueIP()
        await hit('/api/lessons', ip, 120)
        const res = proxy(makeRequest('/api/lessons', ip)) as Response
        expect(res.status).toBe(429)
        expect(res.headers.get('X-RateLimit-Policy')).toBe('api')
        expect(res.headers.get('X-RateLimit-Limit')).toBe('120')
    })

    it('resets after window expiry', async () => {
        vi.useFakeTimers()
        const ip = uniqueIP()
        await hit('/api/lessons', ip, 120)
        vi.advanceTimersByTime(61_000)
        const res = proxy(makeRequest('/api/lessons', ip)) as Response
        expect(res.status).not.toBe(429)
        vi.useRealTimers()
    })
})

// ─── Stripe webhook exemption ─────────────────────────────────────────────────

describe('stripe webhook exemption', () => {
    it('never rate-limits /api/webhook/stripe regardless of request count', async () => {
        const ip = uniqueIP()
        // 200 requests — well above all tier limits
        const res = await hit('/api/webhook/stripe', ip, 200)
        expect((res as Response).status).not.toBe(429)
    })
})

// ─── Admin routes exempt from rate limiting ───────────────────────────────────

describe('admin rate-limit exemption', () => {
    const validToken = Buffer.from('test-secret').toString('base64')

    it('does not rate-limit /api/admin/* paths (handled by admin guard instead)', async () => {
        // /api/admin/* is excluded from the api tier regex: /^\/api\/(?!webhook\/stripe|admin)/
        const ip = uniqueIP()
        const res = await hit('/api/admin/bookings', ip, 200)
        // Should not be a 429; it may pass through or hit the admin guard (redirect)
        expect((res as Response).status).not.toBe(429)
    })
})

// ─── Admin session guard ──────────────────────────────────────────────────────

describe('admin session guard', () => {
    const validToken = Buffer.from('test-secret').toString('base64')

    it('redirects to /admin/login when no cookie is present', () => {
        const res = proxy(makeRequest('/admin/dashboard', uniqueIP())) as Response
        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toContain('/admin/login')
    })

    it('redirects when admin_session cookie has wrong value', () => {
        const res = proxy(
            makeRequest('/admin/dashboard', uniqueIP(), { admin_session: 'wrong-token' })
        ) as Response
        expect(res.status).toBe(307)
    })

    it('passes through when admin_session cookie is valid', () => {
        const res = proxy(
            makeRequest('/admin/dashboard', uniqueIP(), { admin_session: validToken })
        ) as Response
        // NextResponse.next() has status 200
        expect(res.status).not.toBe(307)
        expect(res.status).not.toBe(429)
    })

    it('never redirects /admin/login itself', () => {
        // Even without a cookie, the login page should not redirect
        const res = proxy(makeRequest('/admin/login', uniqueIP())) as Response
        expect(res.status).not.toBe(307)
    })
})

// ─── Non-matched routes pass through ─────────────────────────────────────────

describe('non-matched routes', () => {
    it('passes through page routes like /', () => {
        const res = proxy(makeRequest('/', uniqueIP())) as Response
        expect(res.status).not.toBe(429)
        expect(res.status).not.toBe(307)
    })
})
