import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    error: 'Dynamic Client Registration no soportado en v1',
    docs: 'RFC7591 - Este servidor no permite registro dinámico de clientes en esta versión.',
  }, { status: 501, headers: { 'Access-Control-Allow-Origin': '*' } })
}

export async function GET() {
  return NextResponse.json({ error: 'Not Implemented' }, { status: 501 })
}