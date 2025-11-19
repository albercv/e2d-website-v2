"use client"

import React from 'react'

type Props = { client_id: string, redirect_uri: string, scope: string[], state: string, initialCsrf?: string, code_challenge?: string, code_challenge_method?: string }
export default function AuthorizeForm({ client_id, redirect_uri, scope, state, initialCsrf, code_challenge, code_challenge_method }: Props) {
  const [csrfToken, setCsrfToken] = React.useState(initialCsrf ?? '')
  const [loading, setLoading] = React.useState(!initialCsrf)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    // If we already have a CSRF token from the server, skip client-side fetch
    if (initialCsrf && initialCsrf.length > 0) return
    let active = true
    async function fetchCsrf() {
      try {
        const res = await fetch('/oauth/csrf', { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store', credentials: 'same-origin' })
        if (!res.ok) throw new Error(`CSRF status ${res.status}`)
        const data = await res.json()
        if (active) {
          setCsrfToken(data.csrf || '')
          setLoading(false)
        }
      } catch (e: any) {
        if (active) {
          setError(e?.message || 'No se pudo obtener CSRF')
          setLoading(false)
        }
      }
    }
    fetchCsrf()
    return () => { active = false }
  }, [initialCsrf])

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '1rem 1.25rem' }}>
      <form method="POST" action="/oauth/authorize" style={{ display: 'grid', gap: '0.9rem' }}>
        <input type="hidden" name="client_id" value={client_id} />
        <input type="hidden" name="redirect_uri" value={redirect_uri} />
        <input type="hidden" name="scope" value={scope.join(' ')} />
        <input type="hidden" name="state" value={state} />
        <input type="hidden" name="csrf" value={csrfToken} />
        {/* PKCE fallback si no se establecieron cookies en GET */}
        <input type="hidden" name="code_challenge" value={code_challenge || ''} />
        <input type="hidden" name="code_challenge_method" value={(code_challenge_method || 'S256').toUpperCase()} />

        {loading && <p style={{ color: '#6b7280', textAlign: 'center' }}>Preparando autorización…</p>}
        {error && <p style={{ color: '#dc2626', textAlign: 'center' }}>Error inicializando CSRF: {error}</p>}

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 600, color: '#111827' }}>Email</span>
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            placeholder="admin@evolve2digital.com"
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              color: '#111827',
              background: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: 10,
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              fontSize: '0.95rem',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 600, color: '#111827' }}>Contraseña</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              color: '#111827',
              background: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: 10,
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              fontSize: '0.95rem',
              letterSpacing: '0.08em',
            }}
          />
        </label>

        <button
          type="submit"
          style={{
            padding: '0.7rem 1rem',
            borderRadius: 10,
            border: '1px solid #111827',
            background: '#111827',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'transform 0.05s ease',
            width: '100%',
          }}
          disabled={loading || !!error}
        >
          Conceder acceso
        </button>

        <p style={{ color: '#6b7280', textAlign: 'center', fontSize: '0.85rem' }}>Tu email se usará para generar el token de acceso.</p>
      </form>
    </div>
  )
}