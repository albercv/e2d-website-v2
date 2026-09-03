// Single source of the public support address and mailto builder. Email
// contact is always available regardless of whether WhatsApp is configured.
export const SUPPORT_EMAIL = "hello@evolve2digital.com"

export function getMailHref(subject: string, body?: string): string {
  const params = [`subject=${encodeURIComponent(subject)}`]
  if (body) params.push(`body=${encodeURIComponent(body)}`)
  return `mailto:${SUPPORT_EMAIL}?${params.join("&")}`
}
