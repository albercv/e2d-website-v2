#!/usr/bin/env node

/**
 * Rebuild & Restart Script
 * Ejecuta el build y reinicia el servidor (pm2/systemd) en GCP o servidor propio.
 * 
 * Configuración por variables de entorno:
 * - BUILD_COMMAND: comando de build (por defecto: "npm run build")
 * - RESTART_COMMAND: comando para reiniciar el servicio (ej: "pm2 restart e2d-website-v2" o "systemctl restart e2d-website-v2")
 * - PROJECT_DIR: ruta del proyecto (por defecto: process.cwd())
 * 
 * Uso CLI:
 *   node scripts/rebuild-and-restart.js [--no-restart]
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd()
const BUILD_COMMAND = process.env.BUILD_COMMAND || 'npm run build'
const RESTART_COMMAND = process.env.RESTART_COMMAND || ''
const NO_RESTART = process.argv.includes('--no-restart')

const LOG_PATH = path.join(PROJECT_DIR, 'build.log')
// Lock que evita builds solapados. Lo crea /api/admin/rebuild antes de
// spawn-ear este script, lo borramos aquí al terminar (success o error).
const LOCK_PATH = process.env.BUILD_LOCK_PATH || path.join(PROJECT_DIR, '.build.lock')

function releaseLock() {
  try { fs.unlinkSync(LOCK_PATH) } catch { /* ignore — ya borrado o no existía */ }
}

function appendLog(line) {
  const entry = `[${new Date().toISOString()}] ${line}\n`
  try {
    fs.appendFileSync(LOG_PATH, entry)
  } catch (err) {
    console.error('[rebuild] Error escribiendo build.log:', err.message)
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    appendLog(`[rebuild] Ejecutando: ${command} ${args.join(' ')}`)
    const child = spawn(command, args, { cwd: PROJECT_DIR, env: process.env, ...options })

    child.stdout?.on('data', (data) => appendLog(data.toString().trim()))
    child.stderr?.on('data', (data) => appendLog(data.toString().trim()))

    child.on('error', (err) => {
      appendLog(`[rebuild] Error al ejecutar ${command}: ${err.message}`)
      reject(err)
    })

    child.on('close', (code) => {
      appendLog(`[rebuild] Comando terminado con código: ${code}`)
      if (code === 0) resolve(code)
      else reject(new Error(`${command} salió con código ${code}`))
    })
  })
}

async function main() {
  appendLog('===== Inicio de ciclo de rebuild =====')

  try {
    // Ejecutar build
    const [cmd, ...cmdArgs] = BUILD_COMMAND.split(' ')
    await runCommand(cmd, cmdArgs)
    appendLog('[rebuild] Build completado correctamente')

    // Reiniciar servicio si corresponde
    if (!NO_RESTART && RESTART_COMMAND) {
      const [rcmd, ...rcmdArgs] = RESTART_COMMAND.split(' ')
      await runCommand(rcmd, rcmdArgs)
      appendLog('[rebuild] Servicio reiniciado correctamente')
    } else {
      appendLog('[rebuild] Reinicio omitido (NO_RESTART o RESTART_COMMAND vacío)')
    }

    appendLog('===== Fin de rebuild OK =====')
    releaseLock()
    process.exit(0)
  } catch (err) {
    appendLog(`[rebuild] Fallo en rebuild: ${err.message}`)
    appendLog('===== Fin de rebuild con errores =====')
    releaseLock()
    process.exit(1)
  }
}

// Liberar lock incluso si el proceso recibe SIGTERM/SIGINT (kill normal de PM2
// durante un restart). SIGKILL no nos da chance — el TTL del lock cubre ese caso.
process.on('SIGTERM', () => { releaseLock(); process.exit(143) })
process.on('SIGINT', () => { releaseLock(); process.exit(130) })

main()