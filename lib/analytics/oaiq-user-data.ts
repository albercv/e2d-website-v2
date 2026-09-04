// Builds the `user` matching block of an OpenAI Conversions API event.
// OpenAI requires identifiers normalised then SHA-256 hashed as lowercase
// hex; raw ip/user agent travel as-is. Only call this for visitors who
// granted marketing consent — this data feeds ad attribution.

import { createHash } from "node:crypto"

export interface OaiqUserInput {
  email: string
  phone?: string
  ipAddress?: string
  userAgent?: string
}

export interface OaiqUser {
  emails_sha256: string[]
  phone_numbers_sha256?: string[]
  ip_address?: string
  user_agent?: string
}

// OpenAI accepts 8–15 digit phone numbers; shorter values are noise.
const MIN_PHONE_DIGITS = 8

export function hashIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

function normalisePhone(phone: string | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "")
  return digits.length >= MIN_PHONE_DIGITS ? digits : null
}

export function buildOaiqUser(input: OaiqUserInput): OaiqUser {
  const user: OaiqUser = { emails_sha256: [hashIdentifier(input.email.trim().toLowerCase())] }
  const phone = normalisePhone(input.phone)
  if (phone) user.phone_numbers_sha256 = [hashIdentifier(phone)]
  if (input.ipAddress) user.ip_address = input.ipAddress
  if (input.userAgent) user.user_agent = input.userAgent
  return user
}
