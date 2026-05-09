// Inyecta en cada worker de jest las env vars de aislamiento que `globalSetup`
// preparó. `globalSetup` corre una sola vez en el proceso principal; los
// workers son spawn-eados por `next/jest` con un env limpio (en concreto,
// `BLOG_POSTS_DIR`/`CONTENT_ROOT`/`OAUTH_DB_DIR` no se propagan), así que sin
// este puente cada worker volvería a las defaults — apuntando al volumen de
// producción para BLOG_POSTS_DIR (vía `.env`) o a `${cwd}/data` para OAuth.
//
// El handoff es un fichero JSON que `globalSetup` escribe con el path raíz
// del tmpdir efímero. Lo leemos sincrónicamente porque `setupFiles` debe
// completar antes de que se cargue el primer módulo de test.

const fs = require('fs')
const path = require('path')
const { TMP_HANDOFF_FILE } = require('./jest.global-setup.js')

try {
  const raw = fs.readFileSync(TMP_HANDOFF_FILE, 'utf8')
  const { root } = JSON.parse(raw)
  if (!root) throw new Error('handoff sin root')
  process.env.CONTENT_ROOT = root
  process.env.BLOG_POSTS_DIR = path.join(root, 'content', 'posts')
  process.env.OAUTH_DB_DIR = path.join(root, 'oauth')
  process.env.MEDIA_UPLOADS_ROOT = path.join(root, 'uploads')
} catch (err) {
  throw new Error(
    `jest.setup-env: no pude leer el handoff (${TMP_HANDOFF_FILE}). ` +
    `¿Falta wirear globalSetup en jest.config? Detalle: ${err.message}`
  )
}
