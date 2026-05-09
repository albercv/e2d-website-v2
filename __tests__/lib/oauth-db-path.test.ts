/**
 * @jest-environment node
 *
 * Verifica que `lib/oauth-db.ts` honra `OAUTH_DB_DIR` y materializa el SQLite
 * fuera del árbol del proyecto cuando está seteado. Regresión: el wipe del
 * 8-may borró `data/oauth.sqlite` porque vivía dentro del repo. La fix
 * canónica es `OAUTH_DB_DIR=/var/lib/e2d-oauth` en `ecosystem.config.js`.
 */
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

describe('lib/oauth-db OAUTH_DB_DIR resolution', () => {
  const originalEnv = process.env.OAUTH_DB_DIR
  let tmp: string

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oauth-db-test-'))
    process.env.OAUTH_DB_DIR = tmp
    jest.resetModules()
  })

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.OAUTH_DB_DIR
    else process.env.OAUTH_DB_DIR = originalEnv
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('creates oauth.sqlite inside OAUTH_DB_DIR when set', () => {
    const { getDb } = require('@/lib/oauth-db') as typeof import('@/lib/oauth-db')
    getDb()
    expect(fs.existsSync(path.join(tmp, 'oauth.sqlite'))).toBe(true)
  })

  it('does not write anywhere outside OAUTH_DB_DIR for tests', () => {
    const { getDb } = require('@/lib/oauth-db') as typeof import('@/lib/oauth-db')
    getDb()
    // Si la fixture cae en process.cwd()/data, eso es contaminación de prod-paths.
    const cwdData = path.join(process.cwd(), 'data', 'oauth.sqlite')
    const isLeak = fs.existsSync(cwdData) && fs.realpathSync(cwdData) !== fs.realpathSync(path.join(tmp, 'oauth.sqlite'))
    expect(isLeak).toBe(false)
  })
})
