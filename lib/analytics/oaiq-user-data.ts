// Builds the `user` matching block of an OpenAI Conversions API event.
// OpenAI requires identifiers normalised then SHA-256 hashed as lowercase
// hex; raw ip/user agent travel as-is. Only call this for visitors who
// granted marketing consent — this data feeds ad attribution.

import { createHash } from "node:crypto"

import { splitName } from "./name-split"

export interface OaiqUserInput {
  email: string
  phone?: string
  // Server-side counterpart of the pixel's external_id — the lead id, so
  // the browser and server matching blocks key on the same value.
  externalId?: string
  name?: string
  ipAddress?: string
  userAgent?: string
}

export interface OaiqUser {
  emails_sha256: string[]
  phone_numbers_sha256?: string[]
  external_ids_sha256?: string[]
  first_names_sha256?: string[]
  last_names_sha256?: string[]
  ip_address?: string
  user_agent?: string
}

// OpenAI accepts 8–15 digit phone numbers; shorter values are noise.
const MIN_PHONE_DIGITS = 8

// ASCII punctuation (\x21-\x2F \x3A-\x40 \x5B-\x60 \x7B-\x7E) plus whitespace,
// per OpenAI's name-normalisation spec.
const PUNCTUATION_AND_WHITESPACE_RE = /[\s\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/g

export function hashIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

function normalisePhone(phone: string | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "")
  return digits.length >= MIN_PHONE_DIGITS ? digits : null
}

function normaliseNamePart(part: string): string {
  return part.toLowerCase().replace(PUNCTUATION_AND_WHITESPACE_RE, "")
}

// Splits the full name and hashes each normalised part; either half is
// omitted when the name has nothing to contribute to it.
function buildNameHashes(name: string | undefined): Pick<OaiqUser, "first_names_sha256" | "last_names_sha256"> {
  const { firstName, lastName } = splitName(name ?? "")
  const hashes: Pick<OaiqUser, "first_names_sha256" | "last_names_sha256"> = {}
  if (firstName) hashes.first_names_sha256 = [hashIdentifier(normaliseNamePart(firstName))]
  if (lastName) hashes.last_names_sha256 = [hashIdentifier(normaliseNamePart(lastName))]
  return hashes
}

export function buildOaiqUser(input: OaiqUserInput): OaiqUser {
  const user: OaiqUser = { emails_sha256: [hashIdentifier(input.email.trim().toLowerCase())] }
  const phone = normalisePhone(input.phone)
  if (phone) user.phone_numbers_sha256 = [hashIdentifier(phone)]
  if (input.externalId) user.external_ids_sha256 = [hashIdentifier(input.externalId)]
  Object.assign(user, buildNameHashes(input.name))
  if (input.ipAddress) user.ip_address = input.ipAddress
  if (input.userAgent) user.user_agent = input.userAgent
  return user
}
