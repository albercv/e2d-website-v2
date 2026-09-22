// Pure name splitting shared by the client-side pixel helper
// (lib/analytics/oaiq-user.ts) and the server-side Conversions API mirror
// (lib/analytics/oaiq-user-data.ts): the first whitespace-delimited token is
// the first name, everything after it is the last name. Kept dependency-free
// so a server module can use it without ever importing a "use client" file.
export function splitName(fullName: string): { firstName?: string; lastName?: string } {
  const trimmed = fullName.trim()
  if (!trimmed) return {}
  const [first, ...rest] = trimmed.split(/\s+/)
  const last = rest.join(" ")
  return last ? { firstName: first, lastName: last } : { firstName: first }
}
