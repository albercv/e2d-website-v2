import { NextResponse } from 'next/server'

export async function GET() {
  const issuer = process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com'
  const body = {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    registration_endpoint: `${issuer}/register`,
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