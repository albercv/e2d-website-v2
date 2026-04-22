import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getClientById, validateRedirectUri, validateScopes, storeAuthorizationCode } from '@/lib/oauth-db'
import { addSeconds, randomToken } from '@/lib/oauth-utils'
import { validateAdminCredentials } from '@/lib/oauth-users'

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const client_id = String(form.get('client_id') || '')
  let redirect_uri = String(form.get('redirect_uri') || '')
  // Sanitizar posibles backticks y espacios extra provenientes del cliente
  redirect_uri = redirect_uri.trim().replace(/^`|`$/g, '')
  const scopeStr = String(form.get('scope') || '')
  const scope = scopeStr.split(' ').filter(Boolean)
  const state = String(form.get('state') || '')
  let resource = String(form.get('resource') || '')
  resource = resource.trim().replace(/^`|`$/g, '')
  const cookieStore = cookies();
  const code_challenge_cookie = cookieStore.get('e2d_pkce_challenge')?.value || ''
  const code_challenge_method_cookie = cookieStore.get('e2d_pkce_method')?.value || ''
  // Fallback desde el formulario si no vinieron cookies
  const code_challenge_form = String(form.get('code_challenge') || '')
  const code_challenge_method_form = String(form.get('code_challenge_method') || '')
  const code_challenge = code_challenge_cookie || code_challenge_form
  const code_challenge_method = (code_challenge_method_cookie || code_challenge_method_form || '').toUpperCase() || 'S256'
  const email = String(form.get('email') || '').trim()
  const password = String(form.get('password') || '')
  const csrf = String(form.get('csrf') || '')

  // Debug logging (controlled by env OAUTH_DEBUG)
  const debug = process.env.OAUTH_DEBUG === 'true'
  if (debug) {
    const cookieHeader = request.headers.get('cookie') || ''
    const cookiePreview = cookieHeader.length > 300 ? cookieHeader.slice(0, 300) + '...' : cookieHeader
    console.log('[OAUTH-AUTHZ] POST /oauth/authorize incoming', {
      client_id,
      redirect_uri,
      scope,
      state,
      resource,
      code_challenge_method,
      source_of_pkce: code_challenge_cookie ? 'cookie' : (code_challenge_form ? 'form' : 'none'),
      email,
      csrfField: csrf,
      cookiePreview,
    })
  }

  const csrfCookie = request.cookies.get('e2d_csrf')?.value || ''
  if (!csrf || !csrfCookie || csrf !== csrfCookie) {
    if (debug) {
      console.log('[OAUTH-AUTHZ] CSRF mismatch', {
        csrfField: csrf,
        csrfCookie,
        hasCookie: !!csrfCookie,
      })
    }
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 400 })
  }

  // Ensure PKCE challenge is present ya sea en cookies o formulario
  if (!code_challenge) {
    if (debug) {
      console.log('[OAUTH-AUTHZ] Missing PKCE code_challenge in POST — neither cookie nor form provided')
    }
    return NextResponse.json({ error: 'Missing PKCE code_challenge' }, { status: 400 })
  }

  if (!client_id || !redirect_uri || code_challenge_method !== 'S256') {
    if (debug) {
      console.log('[OAUTH-AUTHZ] Invalid parameters', {
        client_id,
        redirect_uri,
        code_challenge_present: !!code_challenge,
        code_challenge_method,
      })
    }
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }
  // Validar parámetro resource (audiencia objetivo)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com'
  const allowedResource = `${baseUrl}/sse`
  if (!resource || resource !== allowedResource) {
    if (debug) {
      console.log('[OAUTH-AUTHZ] Invalid resource', { resource, expected: allowedResource })
    }
    return NextResponse.json({ error: 'Invalid resource' }, { status: 400 })
  }
  const client = getClientById(client_id)
  if (!client) {
    if (debug) console.log('[OAUTH-AUTHZ] Invalid client_id', { client_id })
    return NextResponse.json({ error: 'Invalid client_id' }, { status: 400 })
  }
  if (!validateRedirectUri(client, redirect_uri)) {
    if (debug) console.log('[OAUTH-AUTHZ] Invalid redirect_uri', { client_id, redirect_uri, allowed: client.redirect_uris })
    return NextResponse.json({ error: 'Invalid redirect_uri' }, { status: 400 })
  }
  const scopesCheck = validateScopes(client, scope)
  if (!scopesCheck.ok) {
    if (debug) console.log('[OAUTH-AUTHZ] Invalid scope requested', { requested: scope, allowed: client.allowed_scopes })
    return NextResponse.json({ error: 'Invalid scope requested' }, { status: 400 })
  }

  const admin = await validateAdminCredentials(email, password)
  if (!admin) {
    if (debug) console.log('[OAUTH-AUTHZ] Invalid credentials', { email })
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Detect HTTPS correctly behind proxies
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const proto = forwardedProto || request.nextUrl.protocol.replace(':', '')
  const isHttps = proto === 'https'

  // Generar authorization code (single use, TTL 60s)
  const code = randomToken(32)
  const expires_at = addSeconds(60)
  storeAuthorizationCode({
    code,
    client_id,
    user_email: admin.email,
    redirect_uri,
    code_challenge: code_challenge as string,
    expires_at,
    scope: scopesCheck.granted,
  })

  if (debug) {
    console.log('[OAUTH-AUTHZ] Authorization code issued', {
      email: admin.email,
      client_id,
      redirect_uri,
      codeLength: code.length,
      scopes: scopesCheck.granted,
    })
  }

  // Opcional: sesión corta
  cookies().set('e2d_oauth_session', admin.email, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 10 * 60,
    path: '/',
  })

  // Limpiar PKCE y CSRF
  cookies().set('e2d_pkce_challenge', '', { httpOnly: true, secure: isHttps, sameSite: 'lax', maxAge: 0, path: '/' })
  cookies().set('e2d_pkce_method', '', { httpOnly: true, secure: isHttps, sameSite: 'lax', maxAge: 0, path: '/' })
  cookies().set('e2d_csrf', '', { httpOnly: true, secure: isHttps, sameSite: 'lax', maxAge: 0, path: '/' })

  const redirectUrl = new URL(redirect_uri)
  redirectUrl.searchParams.set('code', code)
  if (state) redirectUrl.searchParams.set('state', state)

  if (debug) {
    console.log('[OAUTH-AUTHZ] Redirecting', {
      to: redirectUrl.toString(),
      isHttps,
    })
  }

  return NextResponse.redirect(redirectUrl.toString(), { status: 302 })
}
