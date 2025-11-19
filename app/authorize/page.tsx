import React from 'react'
import { getClientById, validateRedirectUri, validateScopes } from '@/lib/oauth-db'
import AuthorizeForm from './AuthorizeForm'
import { cookies, headers } from 'next/headers'
import { mcpLogger } from '@/lib/mcp-logger'

function invalid(message: string) {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <h1 style={{ textAlign: 'center', color: '#f9fafb' }}>OAuth Authorization</h1>
        <p style={{ color: '#fca5a5', textAlign: 'center' }}>{message}</p>
      </div>
    </main>
  )
}

export default function AuthorizePage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const client_id = searchParams.client_id || ''
  const redirect_uri = searchParams.redirect_uri || ''
  const scope = (searchParams.scope || '').split(' ').filter(Boolean)
  const state = searchParams.state || ''
  const response_type = (searchParams.response_type || 'code').toLowerCase()
  const code_challenge = searchParams.code_challenge || ''
  const code_challenge_method = (searchParams.code_challenge_method || 'S256').toUpperCase()

  // Debug flag (enabled in production when OAUTH_DEBUG=true)
  const debug = process.env.OAUTH_DEBUG === 'true'

  // Request context info for logging
  const hdrs = headers()
  const forwardedProto = hdrs.get('x-forwarded-proto') || ''
  const proto = forwardedProto || 'https'
  const host = hdrs.get('x-forwarded-host') || hdrs.get('host') || 'evolve2digital.com'
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('cf-connecting-ip') || undefined
  const userAgent = hdrs.get('user-agent') || undefined

  const paramsObj = Object.fromEntries(Object.entries(searchParams).filter(([_, v]) => v !== undefined)) as Record<string, string>
  const qs = new URLSearchParams(paramsObj).toString()
  const fullUrl = `${proto}://${host}/authorize${qs ? `?${qs}` : ''}`

  if (debug) {
    const cookieHeader = hdrs.get('cookie') || ''
    const cookiePreview = cookieHeader.length > 300 ? cookieHeader.slice(0, 300) + '...' : cookieHeader
    console.log('[OAUTH-AUTHZ] Incoming /authorize from client', {
      fullUrl,
      params: paramsObj,
      headers: { userAgent, ip, host, proto },
      cookiePreview,
    })
    mcpLogger.log({
      eventType: 'success',
      level: 'info',
      endpoint: '/authorize',
      method: 'GET',
      userAgent,
      ip,
      query: qs,
      success: true,
      statusCode: 200,
      metadata: { fullUrl, params: paramsObj },
    })
  }

  const isDev = process.env.NODE_ENV !== 'production'

  const invalidWithLog = (message: string, meta?: Record<string, any>) => {
    if (debug) {
      console.error('[OAUTH-AUTHZ] Validation failed', { message, fullUrl, params: paramsObj, meta })
      mcpLogger.log({
        eventType: 'validation_failed',
        level: 'warn',
        endpoint: '/authorize',
        method: 'GET',
        userAgent,
        ip,
        query: qs,
        success: false,
        statusCode: 400,
        error: message,
        metadata: { fullUrl, params: paramsObj, meta },
      })
    }
    return invalid(message)
  }

  if (response_type !== 'code') {
    return invalidWithLog('response_type debe ser "code"', { response_type })
  }
  if (!client_id || !redirect_uri || !code_challenge || code_challenge_method !== 'S256') {
    return invalidWithLog('Parámetros requeridos: client_id, redirect_uri, scope, code_challenge y code_challenge_method=S256', {
      client_id_present: !!client_id,
      redirect_uri_present: !!redirect_uri,
      code_challenge_present: !!code_challenge,
      code_challenge_method,
    })
  }
  const client = getClientById(client_id)
  if (!client) return invalidWithLog('client_id no válido', { client_id })
  if (!validateRedirectUri(client, redirect_uri)) return invalidWithLog('redirect_uri no permitido para el cliente', { client_id, redirect_uri, allowed: client.redirect_uris })
  const scopesCheck = validateScopes(client, scope)
  if (!scopesCheck.ok) return invalidWithLog('scope solicitado no permitido para el cliente', { requested: scope, allowed: client.allowed_scopes })

  // Leer CSRF existente del request (si el navegador ya lo tiene). No se puede setear en Server Component.
  const existingCsrf = cookies().get('e2d_csrf')?.value

  if (debug) {
    mcpLogger.log({
      eventType: 'success',
      level: 'info',
      endpoint: '/authorize',
      method: 'GET',
      userAgent,
      ip,
      query: qs,
      success: true,
      statusCode: 200,
      metadata: {
        stage: 'render_authorize_ui',
        client_id,
        redirect_uri,
        scope,
        state,
        code_challenge_method,
      },
    })
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '0.75rem', color: '#f9fafb' }}>Iniciar sesión para conceder acceso</h1>
        {isDev && (
          <div style={{ color: '#e5e7eb', textAlign: 'center', marginBottom: '0.75rem' }}>
            <p>Cliente: <b style={{ color: '#f9fafb' }}>{client_id}</b></p>
            <p>Redirigir a: <code style={{ color: '#f9fafb' }}>{redirect_uri}</code></p>
            <p>Scopes solicitados: <code style={{ color: '#f9fafb' }}>{scope.join(' ')}</code></p>
          </div>
        )}
        <AuthorizeForm
          client_id={client_id}
          redirect_uri={redirect_uri}
          scope={scope}
          state={state}
          code_challenge={code_challenge}
          code_challenge_method={code_challenge_method}
          initialCsrf={existingCsrf}
        />
      </div>
    </main>
  )
}