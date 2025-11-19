import 'server-only'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

export type OAuthClient = {
  client_id: string
  client_type: 'public' | 'confidential'
  redirect_uris: string[]
  allowed_scopes: string[]
}

export type AuthorizationCode = {
  code: string
  client_id: string
  user_email: string
  redirect_uri: string
  code_challenge: string
  expires_at: number
  scope: string[]
}

export type RefreshTokenRow = {
  token: string
  client_id: string
  user_email: string
  scope: string[]
  revoked: number
  expires_at: number
}

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'oauth.sqlite')

let db: Database.Database | null = null

export function getDb() {
  if (db) return db
  fs.mkdirSync(DATA_DIR, { recursive: true })
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  initDb()
  return db!
}

export function initDb() {
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_codes (
      code TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      scope TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
      token TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      scope TEXT NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS oauth_clients (
      client_id TEXT PRIMARY KEY,
      client_type TEXT NOT NULL,
      redirect_uris TEXT NOT NULL,
      allowed_scopes TEXT NOT NULL
    );
  `)

  seedClients()
}

export function seedClients() {
  const db = getDb()
  const getClientRow = db.prepare('SELECT * FROM oauth_clients WHERE client_id = ?')
  const insertClient = db.prepare(`INSERT INTO oauth_clients (client_id, client_type, redirect_uris, allowed_scopes) VALUES (?, ?, ?, ?)`)
  const updateClient = db.prepare(`UPDATE oauth_clients SET client_type = ?, redirect_uris = ?, allowed_scopes = ? WHERE client_id = ?`)

  const clients: OAuthClient[] = [
    {
      client_id: 'chatgpt-mcp',
      client_type: 'public',
      redirect_uris: ['https://chatgpt.com/connector_platform_oauth_redirect'],
      allowed_scopes: ['posts:read', 'search:read', 'fetch:read', 'appointments:create', 'agent:query', 'posts:write', 'posts:delete']
    },
    {
      client_id: 'local-dev',
      client_type: 'public',
      redirect_uris: ['http://localhost:3000/oauth/callback'],
      allowed_scopes: ['posts:read', 'search:read', 'fetch:read']
    }
  ]

  for (const c of clients) {
    const existing = getClientRow.get(c.client_id) as any
    if (!existing) {
      insertClient.run(
        c.client_id,
        c.client_type,
        JSON.stringify(c.redirect_uris),
        JSON.stringify(c.allowed_scopes)
      )
    } else {
      // Update if scopes or redirect URIs differ
      const currentRedirects = JSON.parse(existing.redirect_uris || '[]') as string[]
      const currentScopes = JSON.parse(existing.allowed_scopes || '[]') as string[]
      const redirectsChanged = JSON.stringify(currentRedirects) !== JSON.stringify(c.redirect_uris)
      const scopesChanged = JSON.stringify(currentScopes) !== JSON.stringify(c.allowed_scopes)
      if (redirectsChanged || scopesChanged || existing.client_type !== c.client_type) {
        updateClient.run(
          c.client_type,
          JSON.stringify(c.redirect_uris),
          JSON.stringify(c.allowed_scopes),
          c.client_id
        )
      }
    }
  }
}

export function validateRedirectUri(client: OAuthClient, redirect_uri: string): boolean {
  // Allow exact matches and simple wildcard prefixes ending with /*
  for (const allowed of client.redirect_uris) {
    if (allowed.endsWith('/*')) {
      const prefix = allowed.slice(0, -1) // keep trailing '/'
      if (redirect_uri.startsWith(prefix)) return true
    } else if (redirect_uri === allowed) {
      return true
    }
  }
  return false
}

export function getClientById(client_id: string): OAuthClient | null {
  const row = getDb().prepare('SELECT * FROM oauth_clients WHERE client_id = ?').get(client_id) as any
  if (!row) return null
  return {
    client_id: row.client_id,
    client_type: row.client_type,
    redirect_uris: JSON.parse(row.redirect_uris || '[]'),
    allowed_scopes: JSON.parse(row.allowed_scopes || '[]'),
  }
}

export function validateScopes(client: OAuthClient, requestedScopes: string[]): { ok: boolean, granted: string[] } {
  const granted = requestedScopes.filter(s => client.allowed_scopes.includes(s))
  return { ok: granted.length === requestedScopes.length, granted }
}

export function storeAuthorizationCode(code: AuthorizationCode) {
  getDb().prepare(`INSERT INTO oauth_codes (code, client_id, user_email, redirect_uri, code_challenge, expires_at, scope) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(code.code, code.client_id, code.user_email, code.redirect_uri, code.code_challenge, code.expires_at, JSON.stringify(code.scope))
}

export function getAuthorizationCode(code: string): AuthorizationCode | null {
  const row = getDb().prepare('SELECT * FROM oauth_codes WHERE code = ?').get(code) as any
  if (!row) return null
  return {
    code: row.code,
    client_id: row.client_id,
    user_email: row.user_email,
    redirect_uri: row.redirect_uri,
    code_challenge: row.code_challenge,
    expires_at: row.expires_at,
    scope: JSON.parse(row.scope || '[]'),
  }
}

export function deleteAuthorizationCode(code: string) {
  getDb().prepare('DELETE FROM oauth_codes WHERE code = ?').run(code)
}

export function createRefreshToken(rt: RefreshTokenRow) {
  getDb().prepare('INSERT INTO oauth_refresh_tokens (token, client_id, user_email, scope, revoked, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(rt.token, rt.client_id, rt.user_email, JSON.stringify(rt.scope), rt.revoked ? 1 : 0, rt.expires_at)
}

export function getRefreshToken(token: string): RefreshTokenRow | null {
  const row = getDb().prepare('SELECT * FROM oauth_refresh_tokens WHERE token = ?').get(token) as any
  if (!row) return null
  return {
    token: row.token,
    client_id: row.client_id,
    user_email: row.user_email,
    scope: JSON.parse(row.scope || '[]'),
    revoked: row.revoked,
    expires_at: row.expires_at,
  }
}

export function revokeRefreshToken(token: string) {
  getDb().prepare('UPDATE oauth_refresh_tokens SET revoked = 1 WHERE token = ?').run(token)
}

export function deleteExpiredTokensAndCodes(nowUnix: number) {
  const db = getDb()
  db.prepare('DELETE FROM oauth_codes WHERE expires_at <= ?').run(nowUnix)
  db.prepare('DELETE FROM oauth_refresh_tokens WHERE expires_at <= ?').run(nowUnix)
}