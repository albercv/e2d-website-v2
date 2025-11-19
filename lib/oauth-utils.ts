import crypto from 'crypto'

export function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function sha256(input: string): Buffer {
  return crypto.createHash('sha256').update(input).digest()
}

export function pkceS256(verifier: string): string {
  return base64url(sha256(verifier))
}

export function now(): number {
  return Math.floor(Date.now() / 1000)
}

export function addSeconds(seconds: number): number {
  return now() + seconds
}

export function randomToken(bytes = 32): string {
  return base64url(crypto.randomBytes(bytes))
}