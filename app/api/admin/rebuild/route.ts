import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import * as fs from 'fs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(msg: unknown, status = 200) {
  return NextResponse.json(msg, { status })
}

// Lock que evita builds solapados. Stale TTL 30 min: si el lock está más viejo
// es probable que el proceso que lo creó murió sin limpiar (SIGKILL, OOM, crash
// en cascada por el chdir+rm de .next/standalone). El cleanup lo hace el script
// rebuild-and-restart.js al terminar (success O error). Si crash duro, el TTL
// recupera el sistema solo.
const LOCK_TTL_MS = 30 * 60 * 1000

interface LockData {
  jobId: string
  startedAt: number
  buildCommand: string
}

function getLockPath(projectDir: string): string {
  return path.join(projectDir, '.build.lock')
}

function readActiveLock(lockPath: string): LockData | null {
  if (!fs.existsSync(lockPath)) return null
  try {
    const stat = fs.statSync(lockPath)
    const ageMs = Date.now() - stat.mtimeMs
    if (ageMs >= LOCK_TTL_MS) {
      // Stale: el dueño murió sin limpiar. Borramos y dejamos pasar.
      fs.unlinkSync(lockPath)
      return null
    }
    const raw = fs.readFileSync(lockPath, 'utf-8')
    return JSON.parse(raw) as LockData
  } catch {
    // Lock corrupto: lo eliminamos y procedemos.
    try { fs.unlinkSync(lockPath) } catch { /* ignore */ }
    return null
  }
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
  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const bodyObj = (typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {})
  const buildCommand = typeof bodyObj.buildCommand === 'string' ? bodyObj.buildCommand : undefined
  const restartCommand = typeof bodyObj.restartCommand === 'string' ? bodyObj.restartCommand : undefined
  const noRestart = bodyObj.noRestart === true

  const BUILD_COMMAND = buildCommand || process.env.BUILD_COMMAND || 'npm run build'
  const RESTART_COMMAND = restartCommand || process.env.RESTART_COMMAND || ''
  const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd()

  // BUG-11 fix: rechazar si ya hay un build en marcha. Builds solapados
  // dejaban .next/standalone/ inconsistente y daban 500 en cascada.
  const lockPath = getLockPath(PROJECT_DIR)
  const activeLock = readActiveLock(lockPath)
  if (activeLock) {
    return json({
      error: 'build_in_progress',
      lock: activeLock,
      ageSeconds: Math.floor((Date.now() - activeLock.startedAt) / 1000),
      hint: 'Otro rebuild está activo. Reintenta cuando termine, o espera al TTL (30 min).',
    }, 409)
  }

  const jobId = Date.now().toString()
  const lockData: LockData = { jobId, startedAt: Date.now(), buildCommand: BUILD_COMMAND }
  try {
    fs.writeFileSync(lockPath, JSON.stringify(lockData), { encoding: 'utf-8' })
  } catch (err) {
    return json({ error: 'lock_write_failed', message: String(err) }, 500)
  }

  // Ejecutar scripts/rebuild-and-restart.js como proceso desacoplado.
  // El script borra el lock al terminar (success o error) — ver finally en main().
  const scriptPath = path.join(PROJECT_DIR, 'scripts', 'rebuild-and-restart.js')
  const args: string[] = []
  // Pasar env vía process.env (ya está) y permitir body controlar no-restart
  if (noRestart) args.push('--no-restart')

  // Scrub vars privadas que Next inyecta cuando corre en modo standalone.
  // Si el hijo `next build` las hereda, usa el config JSON serializado en
  // __NEXT_PRIVATE_STANDALONE_CONFIG (que pierde funciones como generateBuildId)
  // en lugar de cargar next.config.mjs y falla con "generate is not a function".
  const cleanEnv: NodeJS.ProcessEnv = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('__NEXT_')) continue
    if (k === 'NODE_CHANNEL_FD' || k === 'NODE_CHANNEL_SERIALIZATION_MODE') continue
    cleanEnv[k] = v
  }

  const child = spawn('node', [scriptPath, ...args], {
    cwd: PROJECT_DIR,
    env: {
      ...cleanEnv,
      BUILD_COMMAND,
      RESTART_COMMAND,
      PROJECT_DIR,
      BUILD_LOCK_PATH: lockPath,
    },
    detached: true,
    stdio: 'ignore',
  })

  child.unref()

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
