// lib/blog/media-naming.ts
export class SlugifyError extends Error {
  constructor(input: string) {
    super(`Cannot slugify "${input}": result is empty after normalization`)
    this.name = "SlugifyError"
  }
}

export function slugifyMediaName(input: string): string {
  let s = input.toLowerCase()
  // ñ and ç must be replaced before NFD decomposition since they decompose differently
  s = s.replace(/ñ/g, "n").replace(/ç/g, "c")
  // Strip combining diacritical marks (Unicode range U+0300–U+036F)
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "")
  s = s.replace(/[^a-z0-9_]/g, "_")
  s = s.replace(/_+/g, "_")
  s = s.replace(/^_+|_+$/g, "")
  if (s.length === 0) throw new SlugifyError(input)
  return s
}
