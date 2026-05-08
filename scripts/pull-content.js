#!/usr/bin/env node

/**
 * Pull Content Script
 * Descarga y sincroniza archivos MD/MDX en content/posts antes del build.
 * 
 * Modos soportados:
 * - CONTENT_ARCHIVE_URL: descarga un .tar.gz (o .tgz) con los MDs y los extrae a content/posts
 * - GitHub Content API: GITHUB_CONTENT_OWNER, GITHUB_CONTENT_REPO, GITHUB_CONTENT_PATH, GITHUB_CONTENT_BRANCH (opcional), GITHUB_TOKEN (opcional)
 * 
 * Uso:
 *  - Configura CONTENT_ARCHIVE_URL (recomendado para producción) o variables de GitHub.
 *  - Este script se ejecuta automáticamente antes de next build.
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const { execSync } = require('child_process')

const DEST_DIR = path.join(process.cwd(), 'content', 'posts')

const CONTENT_ARCHIVE_URL = process.env.CONTENT_ARCHIVE_URL
const GITHUB_CONTENT_OWNER = process.env.GITHUB_CONTENT_OWNER
const GITHUB_CONTENT_REPO = process.env.GITHUB_CONTENT_REPO
const GITHUB_CONTENT_PATH = process.env.GITHUB_CONTENT_PATH || 'content/posts'
const GITHUB_CONTENT_BRANCH = process.env.GITHUB_CONTENT_BRANCH || 'main'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

function ensureDestDir() {
  fs.mkdirSync(DEST_DIR, { recursive: true })
}

function cleanDestDir() {
  if (!fs.existsSync(DEST_DIR)) return
  // BUG-16 guard: si DEST_DIR es un symlink (apunta a /var/lib/e2d-content/
  // posts en este servidor), un readdir+rmSync atravesaría el symlink y
  // borraría los archivos del volumen persistente. Abortar antes de tocar
  // nada. Este script se diseñó para CI/build hosts donde content/posts es
  // un dir local efímero; un symlink hacia un volumen externo invalida la
  // premisa del clean.
  const stat = fs.lstatSync(DEST_DIR)
  if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(DEST_DIR)
    throw new Error(
      `[pull-content] REFUSING to clean ${DEST_DIR}: it is a symlink to ${target}. ` +
      `Cleaning would traverse the symlink and delete files in the target volume. ` +
      `Either remove the symlink before running pull-content, or refactor the ` +
      `reader so the symlink is not needed (BUG-16 follow-up).`
    )
  }
  const files = fs.readdirSync(DEST_DIR)
  for (const file of files) {
    const p = path.join(DEST_DIR, file)
    try {
      fs.rmSync(p, { recursive: true, force: true })
    } catch (err) {
      console.warn(`[pull-content] No se pudo eliminar ${p}:`, err.message)
    }
  }
}

function downloadArchiveToDir(url) {
  console.log(`[pull-content] Descargando y extrayendo contenido desde: ${url}`)
  ensureDestDir()
  cleanDestDir()
  try {
    // Requiere curl y tar disponibles en el entorno (Vercel build los tiene por defecto)
    const cmd = `mkdir -p "${DEST_DIR}" && curl -fsSL "${url}" | tar -xz -C "${DEST_DIR}" --strip-components=1`
    execSync(cmd, { stdio: 'inherit' })
    console.log('[pull-content] Contenido extraído en content/posts')
  } catch (error) {
    console.error('[pull-content] Error extrayendo archivo:', error.message)
    process.exit(1)
  }
}

function githubRequest(pathname) {
  const options = {
    hostname: 'api.github.com',
    path: pathname,
    method: 'GET',
    headers: {
      'User-Agent': 'e2d-content-fetcher',
      'Accept': 'application/vnd.github+json',
    }
  }
  if (GITHUB_TOKEN) {
    options.headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`
  }
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(e)
          }
        } else {
          reject(new Error(`GitHub API ${res.statusCode}: ${data}`))
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirects
        https.get(res.headers.location, (res2) => {
          res2.pipe(file)
          res2.on('end', resolve)
          res2.on('error', reject)
        }).on('error', reject)
      } else if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        res.pipe(file)
        res.on('end', resolve)
        res.on('error', reject)
      } else {
        reject(new Error(`HTTP ${res.statusCode} while downloading ${url}`))
      }
    }).on('error', reject)
  })
}

async function fetchGitHubDirectory(owner, repo, dirPath, branch, destDir) {
  console.log(`[pull-content] Descargando contenido de GitHub: ${owner}/${repo}/${dirPath} (branch: ${branch})`)
  ensureDestDir()
  cleanDestDir()
  const apiPath = `/repos/${owner}/${repo}/contents/${encodeURIComponent(dirPath)}?ref=${encodeURIComponent(branch)}`
  try {
    const items = await githubRequest(apiPath)
    if (!Array.isArray(items)) {
      throw new Error('Respuesta inesperada de GitHub API (se esperaba una lista)')
    }

    // Recorrer archivos y subdirectorios
    for (const item of items) {
      if (item.type === 'file' && (item.name.endsWith('.md') || item.name.endsWith('.mdx'))) {
        const outPath = path.join(destDir, item.name)
        console.log(`[pull-content] Descargando archivo: ${item.path}`)
        await downloadFile(item.download_url, outPath)
      } else if (item.type === 'dir') {
        const subDest = path.join(destDir, item.name)
        fs.mkdirSync(subDest, { recursive: true })
        await fetchGitHubDirectory(owner, repo, item.path, branch, subDest)
      } else {
        // Ignorar otros tipos (symlinks, etc.)
        console.log(`[pull-content] Ignorado: ${item.path} (${item.type})`)
      }
    }

    console.log('[pull-content] GitHub content sincronizado en content/posts')
  } catch (err) {
    console.error('[pull-content] Error descargando contenido desde GitHub:', err.message)
    process.exit(1)
  }
}

async function main() {
  // Si no se configuró ninguna fuente externa, salimos sin error
  if (!CONTENT_ARCHIVE_URL && !GITHUB_CONTENT_OWNER) {
    console.log('[pull-content] No hay fuente de contenido externa configurada (CONTENT_ARCHIVE_URL o GitHub). Se usa contenido local si existe.')
    return
  }

  if (CONTENT_ARCHIVE_URL) {
    downloadArchiveToDir(CONTENT_ARCHIVE_URL)
    return
  }

  if (GITHUB_CONTENT_OWNER && GITHUB_CONTENT_REPO) {
    await fetchGitHubDirectory(
      GITHUB_CONTENT_OWNER,
      GITHUB_CONTENT_REPO,
      GITHUB_CONTENT_PATH,
      GITHUB_CONTENT_BRANCH,
      DEST_DIR
    )
    return
  }

  console.warn('[pull-content] Variables de GitHub incompletas. Debes definir al menos GITHUB_CONTENT_OWNER y GITHUB_CONTENT_REPO.')
}

main().catch((err) => {
  console.error('[pull-content] Error:', err)
  process.exit(1)
})