// Returns the configured WhatsApp number in international format (digits only)
// or null if NEXT_PUBLIC_WHATSAPP_NUMBER is unset/empty. Call sites must
// render-guard on null so an unconfigured deploy hides the link entirely.
export function getWhatsAppNumber(): string | null {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim()
  return raw && raw.length > 0 ? raw : null
}

export function getWhatsAppHref(message?: string): string | null {
  const number = getWhatsAppNumber()
  if (!number) return null
  const base = `https://wa.me/${number}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
