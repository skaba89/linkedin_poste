import { NextRequest, NextResponse } from 'next/server';

// ─── Pre-configured limiters ──────────────────────────────────────────────
// Default: ENABLED for security. Set RATE_LIMIT_ENABLED=false to disable.
// ─── EMERGENCY: Rate limiting disabled ──────────────────────────────────
// In-memory rate limiters are unreliable with PM2 multi-worker setup
// (each worker has its own counter → limits are effectively N× configured).
// Re-enable with RATE_LIMIT_ENABLED=true and switch to Redis-backed limiters.
const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED === 'true';

// ─── Public paths (no auth required) ───────────────────────────────────────

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/linkedin/callback',
  '/api/linkedin/authorize',
  '/api/linkedin/webhook',
  '/api/route',
  '/',
  '/login',
  '/register',
  '/_next',
  '/favicon',
  '/static',
];

// ─── Middleware ─────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip for health endpoints
  if (pathname === '/api/health') {
    return NextResponse.next();
  }
  if (pathname === '/api' && request.nextUrl.searchParams.get('health') === '1') {
    return NextResponse.next();
  }

  // ─── Rate limiting (disabled by default) ────────────────────────────────
  // Rate limiting is disabled. Enable with RATE_LIMIT_ENABLED=true + Redis.
  if (pathname.startsWith('/api/') && RATE_LIMIT_ENABLED) {
    // Rate limiting would go here with Redis-backed limiters
  }

  // ─── Auth check ───────────────────────────────────────────────────────
  // Public paths (no auth required)
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API routes require Authorization header
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

// ─── Config ────────────────────────────────────────────────────────────────

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|static/).*)'],
};
