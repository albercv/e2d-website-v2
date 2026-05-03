import { NextResponse } from 'next/server'

export async function GET() {
  const resource = process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com'
  const body = {
    resource,
    authorization_servers: [resource],
    bearer_methods_supported: ['header'],
    scopes_supported: [
      'posts:read',
      'search:read',
      'fetch:read',
      'appointments:create',
      'agent:query',
      'posts:write',
      'posts:delete',
    ],
  }
  return NextResponse.json(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
