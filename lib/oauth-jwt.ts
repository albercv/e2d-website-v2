import jwt from 'jsonwebtoken'
import { now } from './oauth-utils'

export type AccessTokenClaims = {
  sub: string
  email: string
  role: 'admin' | 'assistant'
  scope: string[]
  iss: string
  aud: string
  iat: number
  exp: number
}

export function getIssuer(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com'
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET debe estar configurado y tener al menos 32 bytes')
  }
  return secret
}

export function signAccessToken(payload: Omit<AccessTokenClaims, 'iat' | 'exp' | 'iss'>, ttlSeconds = 3600): string {
  const issuer = getIssuer()
  const iat = now()
  const exp = iat + ttlSeconds
  const claims: AccessTokenClaims = {
    ...payload,
    iss: issuer,
    iat,
    exp,
  }
  return jwt.sign(claims, getJwtSecret(), { algorithm: 'HS256' })
}

export function verifyAccessToken(token: string): AccessTokenClaims | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as AccessTokenClaims
    if (!decoded || typeof decoded !== 'object') return null
    // Validaciones mínimas
    if (!decoded.sub || !decoded.email || !decoded.role || !decoded.scope || !decoded.iss || !decoded.aud || !decoded.iat || !decoded.exp) {
      return null
    }
    // Issuer debe coincidir
    if (decoded.iss !== getIssuer()) return null
    // exp e iat están validados por jwt.verify
    return decoded
  } catch (e) {
    return null
  }
}