import { NextRequest, NextResponse } from 'next/server'
import { getClientById, validateRedirectUri } from '@/lib/oauth-db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const client_id = url.searchParams.get('client_id') || ''
  let redirect_uri = url.searchParams.get('redirect_uri') || ''
  redirect_uri = redirect_uri.trim().replace(/^`|`$/g, '')
  const response_type = (url.searchParams.get('response_type') || 'code').toLowerCase()
  const scopeStr = url.searchParams.get('scope') || ''
  const scope = scopeStr.split(' ').filter(Boolean)
  const state = url.searchParams.get('state') || ''
  const code_challenge = url.searchParams.get('code_challenge') || ''
  const code_challenge_method = (url.searchParams.get('code_challenge_method') || 'S256').toUpperCase()

  // Validaciones básicas (PKCE opcional en GET)
  if (!client_id || !redirect_uri || response_type !== 'code') {
    return NextResponse.json({ error: 'Invalid authorization request' }, { status: 400 })
  }

  const client = getClientById(client_id)
  if (!client) {
    return NextResponse.json({ error: 'Invalid client_id' }, { status: 400 })
  }
  if (!validateRedirectUri(client, redirect_uri)) {
    return NextResponse.json({ error: 'Invalid redirect_uri' }, { status: 400 })
  }

  // Detect HTTPS correctamente detrás de proxies
  const forwardedProto = req.headers.get('x-forwarded-proto')
  const proto = forwardedProto || req.nextUrl.protocol.replace(':', '')
  const isHttps = proto === 'https'

  // Construir URL de redirección a la UI, preservando los parámetros
  const redirectUrl = new URL(url.origin + '/authorize/page')
  url.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })

  const res = NextResponse.redirect(redirectUrl.toString(), 302)

  // Guardar cookies PKCE sólo si vienen en la request y el método es S256
  if (code_challenge && code_challenge_method === 'S256') {
    res.cookies.set('e2d_pkce_challenge', code_challenge, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 300, // 5 minutos
    })

    res.cookies.set('e2d_pkce_method', code_challenge_method, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 300, // 5 minutos
    })
  }

  return res
}