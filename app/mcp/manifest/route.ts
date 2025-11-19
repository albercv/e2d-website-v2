import { NextRequest, NextResponse } from 'next/server'

// Este endpoint está deprecado. Redirige al único manifest válido en /api/mcp/manifest
export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const revalidate = 0

export async function GET(request: NextRequest) {
  // Preserva query params en la redirección
  const url = new URL(request.url)
  url.pathname = '/api/mcp/manifest'
  return NextResponse.redirect(url.toString(), 307)
}

export async function HEAD(request: NextRequest) {
  const url = new URL(request.url)
  url.pathname = '/api/mcp/manifest'
  return NextResponse.redirect(url.toString(), 307)
}

export async function OPTIONS() {
  // Opcionalmente permitir CORS básico para preflight en este endpoint
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, User-Agent, X-Requested-With',
    },
  })
}