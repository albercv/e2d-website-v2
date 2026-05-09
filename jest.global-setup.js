// Aislamiento total de tests respecto al filesystem de producción.
//
// Origen: incidente del 8-may. Los tests `mcp-posts-create`/`posts-write`
// escribían contra `/var/lib/e2d-content/posts` porque `next/jest` carga `.env`
// (que define `BLOG_POSTS_DIR=/var/lib/e2d-content/posts`) ANTES de que el
// `globalSetup` defensivo (`jest.setup-prod-guard.js`) tuviera oportunidad de
// abortar. El guard sólo aborta; este setup además REEMPLAZA la env por un
// directorio temporal único, así que ningún test puede tocar prod por error.
//
// Cubre las cuatro env vars que apuntan a estado persistente:
//   - CONTENT_ROOT       — usado por posts-runtime (lector)
//   - BLOG_POSTS_DIR     — usado por posts-write (escritor)
//   - OAUTH_DB_DIR       — usado por lib/oauth-db (sqlite)
//   - MEDIA_UPLOADS_ROOT — usado por uploads/handlers de media
//
// Tras `globalSetup`, los workers de Jest se forkean y heredan el env modificado.
// El path del tmpdir se persiste en `globalThis.__E2D_TEST_TMPDIR__` y en un
// fichero (`<tmp>.json`) que el teardown lee para limpiar — los workers no
// pueden compartir variables de proceso con el setup, sólo env vars.

const fs = require('fs')
const os = require('os')
const path = require('path')

const PROD_PREFIX = '/var/lib/e2d-content'
const TMP_HANDOFF_FILE = path.join(os.tmpdir(), 'e2d-jest-tmpdir.json')

function resolveSafe(p) {
  try {
    return fs.realpathSync(p)
  } catch {
    return path.resolve(p)
  }
}

module.exports = async function globalSetup() {
  // 1) Crear raíz temporal aislada por run de jest.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2d-jest-'))
  const contentRoot = root
  const postsDir = path.join(root, 'content', 'posts')
  const oauthDir = path.join(root, 'oauth')
  const uploadsDir = path.join(root, 'uploads')

  fs.mkdirSync(postsDir, { recursive: true })
  fs.mkdirSync(oauthDir, { recursive: true })
  fs.mkdirSync(uploadsDir, { recursive: true })

  // 2) SOBRESCRIBIR sin condiciones (BUG-15: `.env` ya cargó valores de prod).
  process.env.CONTENT_ROOT = contentRoot
  process.env.BLOG_POSTS_DIR = postsDir
  process.env.OAUTH_DB_DIR = oauthDir
  process.env.MEDIA_UPLOADS_ROOT = uploadsDir

  // 3) Defense-in-depth: si por la razón que sea alguien volvió a setear una
  //    var dentro del volumen de prod después de este punto, abortar.
  for (const [name, value] of Object.entries({
    CONTENT_ROOT: process.env.CONTENT_ROOT,
    BLOG_POSTS_DIR: process.env.BLOG_POSTS_DIR,
    OAUTH_DB_DIR: process.env.OAUTH_DB_DIR,
    MEDIA_UPLOADS_ROOT: process.env.MEDIA_UPLOADS_ROOT,
  })) {
    const resolved = resolveSafe(value)
    if (resolved.startsWith(PROD_PREFIX) || resolved.startsWith('/var/lib/e2d-')) {
      throw new Error(
        `TEST_PROD_GUARD: ${name}=${value} -> ${resolved}, dentro de /var/lib/e2d-*. Aborto. Ver BUG-15.`
      )
    }
  }

  // 4) Persistir el tmpdir para el teardown (los workers no comparten globals
  //    con el proceso main de jest).
  globalThis.__E2D_TEST_TMPDIR__ = root
  fs.writeFileSync(TMP_HANDOFF_FILE, JSON.stringify({ root }), 'utf8')
}

module.exports.PROD_PREFIX = PROD_PREFIX
module.exports.TMP_HANDOFF_FILE = TMP_HANDOFF_FILE
