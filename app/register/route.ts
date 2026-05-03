import { NextRequest, NextResponse } from 'next/server'
import { createClient, generateClientId } from '@/lib/oauth-db'

export const runtime = 'nodejs'

const ALL_SCOPES = [
  'posts:read',
  'search:read',
  'fetch:read',
  'appointments:create',
  'agent:query',
  'posts:write',
  'posts:delete',
]

const ALLOWED_REDIRECT_PATTERNS: RegExp[] = [
  /^https:\/\/claude\.ai\/[^\s]+$/,
  /^https:\/\/[a-z0-9-]+\.claude\.ai\/[^\s]+$/,
  /^http:\/\/localhost(:\d+)?(\/.*)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?(\/.*)?$/,
]

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function err(status: number, error: string, description: string) {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: CORS_HEADERS }
  )
}

function isAllowedRedirect(uri: unknown): uri is string {
  return typeof uri === 'string' && ALLOWED_REDIRECT_PATTERNS.some(p => p.test(uri))
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return err(400, 'invalid_client_metadata', 'Body must be valid JSON')
  }

  const redirect_uris = body?.redirect_uris
  if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    return err(400, 'invalid_redirect_uri', 'redirect_uris is required and must be a non-empty array')
  }

  for (const uri of redirect_uris) {
    if (!isAllowedRedirect(uri)) {
      return err(
        400,
        'invalid_redirect_uri',
        `redirect_uri not in allowlist: ${typeof uri === 'string' ? uri : '<non-string>'}`
      )
    }
  }

  const client_id = generateClientId()
  createClient({
    client_id,
    client_type: 'public',
    redirect_uris,
    allowed_scopes: ALL_SCOPES,
  })

  const response: Record<string, unknown> = {
    client_id,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope: ALL_SCOPES.join(' '),
  }
  if (typeof body.client_name === 'string' && body.client_name.length > 0) {
    response.client_name = body.client_name
  }

  return NextResponse.json(response, { status: 201, headers: CORS_HEADERS })
}
