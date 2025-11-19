import React from 'react'
import { getClientById, validateRedirectUri, validateScopes } from '@/lib/oauth-db'
import AuthorizeForm from './AuthorizeForm'
import { cookies } from 'next/headers'

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

  const isDev = process.env.NODE_ENV !== 'production'

  if (response_type !== 'code') {
    return invalid('response_type debe ser "code"')
  }
  if (!client_id || !redirect_uri || !code_challenge || code_challenge_method !== 'S256') {
    return invalid('Parámetros requeridos: client_id, redirect_uri, scope, code_challenge y code_challenge_method=S256')
  }
  const client = getClientById(client_id)
  if (!client) return invalid('client_id no válido')
  if (!validateRedirectUri(client, redirect_uri)) return invalid('redirect_uri no permitido para el cliente')
  const scopesCheck = validateScopes(client, scope)
  if (!scopesCheck.ok) return invalid('scope solicitado no permitido para el cliente')

  // Leer CSRF existente del request (si el navegador ya lo tiene). No se puede setear en Server Component.
  const existingCsrf = cookies().get('e2d_csrf')?.value

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