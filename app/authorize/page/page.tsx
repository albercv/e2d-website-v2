import React from 'react'
import AuthorizeForm from '../AuthorizeForm'

export default function AuthorizePage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const client_id = searchParams.client_id || ''
  const redirect_uri = searchParams.redirect_uri || ''
  const scope = (searchParams.scope || '').split(' ').filter(Boolean)
  const state = searchParams.state || ''
  const response_type = (searchParams.response_type || 'code').toLowerCase()
  const code_challenge = searchParams.code_challenge || ''
  const code_challenge_method = (searchParams.code_challenge_method || 'S256').toUpperCase()

  // Removed PKCE cookie writing. UI-only page should not set cookies.
  // if (code_challenge) {
  //   const cookieStore = cookies();
  //   cookieStore.set('e2d_pkce_challenge', code_challenge, {
  //     httpOnly: true,
  //     secure: true,
  //     sameSite: 'lax',
  //     path: '/',
  //     maxAge: 300 // 5 minutos
  //   });
  // }
  //
  // if (code_challenge_method) {
  //   const cookieStore = cookies();
  //   cookieStore.set('e2d_pkce_method', code_challenge_method, {
  //     httpOnly: true,
  //     secure: true,
  //     sameSite: 'lax',
  //     path: '/',
  //     maxAge: 300 // 5 minutos
  //   });
  // }
  // Removed CSRF cookie initialization. UI-only page should not set cookies.
  // const cookieStore = cookies();
  // let csrfToken = cookieStore.get('e2d_csrf')?.value || ''
  // if (!csrfToken) {
  //   csrfToken = crypto.randomBytes(24).toString('hex')
  // }
  // cookieStore.set('e2d_csrf', csrfToken, {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === 'production',
  //   sameSite: 'lax',
  //   path: '/',
  //   maxAge: 600 // 10 minutos
  // })

  const isDev = process.env.NODE_ENV !== 'production'

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '0.75rem', color: '#f9fafb' }}>Iniciar sesión para conceder acceso</h1>
        {isDev && (
          <div style={{ color: '#e5e7eb', textAlign: 'center', marginBottom: '0.75rem' }}>
            <p>Cliente: <b style={{ color: '#f9fafb' }}>{client_id}</b></p>
            <p>Redirigir a: <code style={{ color: '#f9fafb' }}>{redirect_uri}</code></p>
            <p>Scopes solicitados: <code style={{ color: '#f9fafb' }}>{scope.join(' ')}</code></p>
            <p>response_type: <code style={{ color: '#f9fafb' }}>{response_type}</code></p>
            <p>code_challenge_method: <code style={{ color: '#f9fafb' }}>{code_challenge_method}</code></p>
          </div>
        )}
        <AuthorizeForm
          client_id={client_id}
          redirect_uri={redirect_uri}
          scope={scope}
          state={state}
          initialCsrf={undefined}
        />
      </div>
    </main>
  )
}