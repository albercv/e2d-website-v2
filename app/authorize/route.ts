import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code_challenge = url.searchParams.get('code_challenge') || ''
  const code_challenge_method = (url.searchParams.get('code_challenge_method') || 'S256').toUpperCase()

  // Build redirect target to the UI page, preserving original query params
  const redirectUrl = new URL(url.origin + '/authorize/page')
  // Preserve all original query params
  url.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })

  const res = NextResponse.redirect(redirectUrl.toString(), 302)

  // Save PKCE cookies if present
  if (code_challenge) {
    res.cookies.set('e2d_pkce_challenge', code_challenge, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 300, // 5 minutes
    })
  }

  if (code_challenge_method) {
    res.cookies.set('e2d_pkce_method', code_challenge_method, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 300, // 5 minutes
    })
  }

  return res
}