import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(msg: any, status = 200) {
  return NextResponse.json(msg, { status })
}

function requireApiKey(request: NextRequest) {
  const expected = process.env.E2D_MCP_API_KEY
  const authHeader = request.headers.get('authorization')
  const xApiKey = request.headers.get('x-api-key')
  let provided: string | null = null

  if (xApiKey && xApiKey.trim().length > 0) provided = xApiKey.trim()
  else if (authHeader) {
    const [scheme, token] = authHeader.split(' ')
    if (scheme?.toLowerCase() === 'bearer' && token) provided = token.trim()
  }

  if (!expected) return { error: 'Missing E2D_MCP_API_KEY on server', status: 500 }
  if (!provided) return { error: 'Missing API key', status: 401 }
  if (provided !== expected) return { error: 'Invalid API key', status: 403 }
  return null
}

export async function POST(request: NextRequest) {
  const authErr = requireApiKey(request)
  if (authErr) return json({ error: authErr.error }, authErr.status)

  // Permitir override de comandos por body
  let body: any = {}
  try { body = await request.json() } catch {}
  const BUILD_COMMAND = (body?.buildCommand as string) || process.env.BUILD_COMMAND || 'npm run build'
  const RESTART_COMMAND = (body?.restartCommand as string) || process.env.RESTART_COMMAND || ''
  const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd()

  // Ejecutar scripts/rebuild-and-restart.js como proceso desacoplado
  const scriptPath = path.join(PROJECT_DIR, 'scripts', 'rebuild-and-restart.js')
  const args: string[] = []
  // Pasar env vía process.env (ya está) y permitir body controlar no-restart
  if (body?.noRestart === true) args.push('--no-restart')

  const child = spawn('node', [scriptPath, ...args], {
    cwd: PROJECT_DIR,
    env: {
      ...process.env,
      BUILD_COMMAND,
      RESTART_COMMAND,
      PROJECT_DIR,
    },
    detached: true,
    stdio: 'ignore',
  })

  child.unref()

  const jobId = Date.now().toString()
  return json({
    accepted: true,
    jobId,
    message: 'Rebuild iniciado. Revisa build.log para el progreso.',
    logPath: path.join(PROJECT_DIR, 'build.log'),
    buildCommand: BUILD_COMMAND,
    restartCommand: RESTART_COMMAND || null,
  }, 202)
}

export async function GET() {
  return json({
    info: 'POST to this endpoint with Authorization to trigger rebuild',
    requires: ['Authorization: Bearer <E2D_MCP_API_KEY>'],
    env: ['BUILD_COMMAND', 'RESTART_COMMAND', 'PROJECT_DIR'],
  })
}