// Limpia el tmpdir creado por jest.global-setup.js.
//
// Lee el path desde globalThis (caso happy) o del fichero handoff (por si el
// teardown corre en un contexto donde globalThis se reseteó). Forzamos `force:
// true` para que si algún test dejó ficheros con flags raros, igualmente se
// borren — no queremos que `/tmp` se llene de `e2d-jest-*`.

const fs = require('fs')
const path = require('path')
const { TMP_HANDOFF_FILE } = require('./jest.global-setup.js')

module.exports = async function globalTeardown() {
  let root = globalThis.__E2D_TEST_TMPDIR__
  if (!root) {
    try {
      root = JSON.parse(fs.readFileSync(TMP_HANDOFF_FILE, 'utf8')).root
    } catch {
      // Sin handoff y sin global → nada que limpiar.
      return
    }
  }
  if (root && fs.existsSync(root)) {
    fs.rmSync(root, { recursive: true, force: true })
  }
  if (fs.existsSync(TMP_HANDOFF_FILE)) {
    try { fs.unlinkSync(TMP_HANDOFF_FILE) } catch {}
  }
}
