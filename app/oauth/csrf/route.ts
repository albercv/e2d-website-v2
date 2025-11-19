import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  // Detect HTTPS correctly behind proxies
  const forwardedProto = req.headers.get('x-forwarded-proto')
  const proto = forwardedProto || req.nextUrl.protocol.replace(':', '')
  const isHttps = proto === 'https'

  // Debug logging (controlled by env OAUTH_DEBUG)
  const debug = process.env.OAUTH_DEBUG === 'true'
  if (debug) {
    console.log('[OAUTH-CSRF] GET /oauth/csrf incoming', {
      forwardedProto,
      proto,
      isHttps,
      existingCookie: req.cookies.get('e2d_csrf')?.value || null,
    })
  }

  // Idempotent: if a CSRF cookie already exists, reuse it to avoid race conditions in dev Strict Mode
  const existing = req.cookies.get('e2d_csrf')?.value
  const csrfToken = existing && existing.length > 0 ? existing : crypto.randomBytes(24).toString('hex')

  cookies().set('e2d_csrf', csrfToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 10 * 60, // 10 minutes
    path: '/',
  })

  if (debug) {
    console.log('[OAUTH-CSRF] GET /oauth/csrf response', {
      csrfTokenLength: csrfToken.length,
      csrfToken,
    })
  }

  return NextResponse.json({ csrf: csrfToken }, { headers: { 'Cache-Control': 'no-store' } })
}