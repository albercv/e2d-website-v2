import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizationCode, deleteAuthorizationCode, getRefreshToken, createRefreshToken, revokeRefreshToken, getClientById } from '@/lib/oauth-db'
import { pkceS256, now, addSeconds, randomToken } from '@/lib/oauth-utils'
import { signAccessToken } from '@/lib/oauth-jwt'
import { isAllowedResource } from '@/lib/oauth-resource'

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { 'Access-Control-Allow-Origin': '*' } })
}

async function readBody(req: NextRequest): Promise<Record<string, string>> {
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await req.text()
    const params = new URLSearchParams(text)
    const obj: Record<string, string> = {}
    params.forEach((v, k) => obj[k] = v)
    return obj
  }
  try {
    const json = await req.json()
    return json
  } catch {
    // intentar como formData
    try {
      const form = await req.formData()
      const obj: Record<string, string> = {}
      form.forEach((v, k) => obj[k] = String(v))
      return obj
    } catch {
      return {}
    }
  }
}

export async function POST(request: NextRequest) {
  const body = await readBody(request)
  const grant_type = (body.grant_type || '').toLowerCase()

  // Debug logging (controlled by env OAUTH_DEBUG)
  const debug = process.env.OAUTH_DEBUG === 'true'
  if (debug) {
    console.log('[OAUTH-TOKEN] POST /token incoming', {
      grant_type,
      contentType: request.headers.get('content-type') || null,
      bodyKeys: Object.keys(body),
    })
  }

  if (grant_type === 'authorization_code') {
    const code = body.code || ''
    const code_verifier = body.code_verifier || ''
    const client_id = body.client_id || ''
    const redirect_uri = body.redirect_uri || ''
    const resource = (body.resource || '').trim().replace(/^`|`$/g, '')
    if (!code || !code_verifier || !client_id || !redirect_uri) {
      if (debug) console.log('[OAUTH-TOKEN] Missing params', { code: !!code, code_verifier: !!code_verifier, client_id: !!client_id, redirect_uri: !!redirect_uri })
      return error('Parámetros requeridos: code, code_verifier, client_id, redirect_uri', 400)
    }
    // Validar resource (RFC 8707 — multiple shapes accepted, see lib/oauth-resource).
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com'
    if (!isAllowedResource(resource, baseUrl)) {
      if (debug) console.log('[OAUTH-TOKEN] Invalid resource (authorization_code)', { resource, baseUrl })
      return error('Parámetro resource inválido', 400)
    }
    const authCode = getAuthorizationCode(code)
    if (!authCode) return error('authorization_code inválido o usado', 400)
    if (authCode.expires_at < now()) {
      deleteAuthorizationCode(code)
      if (debug) console.log('[OAUTH-TOKEN] Code expired', { codeLength: code.length })
      return error('authorization_code expirado', 400)
    }
    const client = getClientById(client_id)
    if (!client) return error('client_id inválido', 400)
    if (authCode.client_id !== client_id) return error('client_id no coincide', 400)
    if (authCode.redirect_uri !== redirect_uri) return error('redirect_uri no coincide', 400)

    const computedChallenge = pkceS256(code_verifier)
    if (computedChallenge !== authCode.code_challenge) {
      if (debug) console.log('[OAUTH-TOKEN] PKCE mismatch', { verifierLen: code_verifier.length, expected: authCode.code_challenge, computed: computedChallenge })
      return error('PKCE code_verifier inválido', 400)
    }

    // Emitir token
    const role: 'admin' | 'assistant' = client.client_type === 'public' ? 'assistant' : 'admin'
    const access_token = signAccessToken({
      sub: authCode.user_email,
      email: authCode.user_email,
      role,
      scope: authCode.scope,
      aud: resource,
    }, 3600)
    const refresh_token = randomToken(48)
    createRefreshToken({
      token: refresh_token,
      client_id,
      user_email: authCode.user_email,
      scope: authCode.scope,
      revoked: 0,
      expires_at: addSeconds(30 * 24 * 3600), // 30 días
    })

    // Single-use: borrar el code
    deleteAuthorizationCode(code)

    if (debug) {
      console.log('[OAUTH-TOKEN] Tokens issued', {
        client_id,
        email: authCode.user_email,
        scope: authCode.scope,
        accessTokenLen: access_token.length,
        refreshTokenLen: refresh_token.length,
      })
    }

    return NextResponse.json({
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: authCode.scope.join(' '),
    }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } })
  }

  if (grant_type === 'refresh_token') {
    const refresh_token = body.refresh_token || ''
    const client_id = body.client_id || ''
    const resource = (body.resource || '').trim().replace(/^`|`$/g, '')
    if (!refresh_token || !client_id) {
      if (debug) console.log('[OAUTH-TOKEN] Missing params (refresh)', { refresh_token: !!refresh_token, client_id: !!client_id })
      return error('Parámetros requeridos: refresh_token, client_id', 400)
    }
    // Validar resource (RFC 8707 — multiple shapes accepted, see lib/oauth-resource).
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com'
    if (!isAllowedResource(resource, baseUrl)) {
      if (debug) console.log('[OAUTH-TOKEN] Invalid resource (refresh_token)', { resource, baseUrl })
      return error('Parámetro resource inválido', 400)
    }
    const rt = getRefreshToken(refresh_token)
    if (!rt) return error('refresh_token inválido', 400)
    if (rt.client_id !== client_id) return error('client_id no coincide', 400)
    if (rt.revoked) return error('refresh_token revocado', 400)
    if (rt.expires_at < now()) return error('refresh_token expirado', 400)

    const client = getClientById(client_id)
    if (!client) return error('client_id inválido', 400)

    // Rotación: revocar el actual y emitir uno nuevo
    revokeRefreshToken(refresh_token)

    const role: 'admin' | 'assistant' = client.client_type === 'public' ? 'assistant' : 'admin'
    const access_token = signAccessToken({
      sub: rt.user_email,
      email: rt.user_email,
      role,
      scope: rt.scope,
      aud: resource,
    }, 3600)
    const new_refresh_token = randomToken(48)
    createRefreshToken({
      token: new_refresh_token,
      client_id,
      user_email: rt.user_email,
      scope: rt.scope,
      revoked: 0,
      expires_at: addSeconds(30 * 24 * 3600),
    })

    if (debug) {
      console.log('[OAUTH-TOKEN] Tokens rotated', {
        client_id,
        email: rt.user_email,
        scope: rt.scope,
        accessTokenLen: access_token.length,
        refreshTokenLen: new_refresh_token.length,
      })
    }

    return NextResponse.json({
      access_token,
      refresh_token: new_refresh_token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: rt.scope.join(' '),
    }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } })
  }

  return error('grant_type no soportado. Use authorization_code o refresh_token', 400)
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  } })
}
