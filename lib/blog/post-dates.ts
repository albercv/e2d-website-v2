/**
 * Fechas de un post: publicación (`date`) y última modificación real
 * (`updated`, opcional en el frontmatter).
 *
 * Módulo puro (sin `fs`) para poder importarlo desde componentes cliente,
 * el sitemap y el JSON-LD con una única regla de negocio.
 */

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/

export interface PostDates {
  date: string
  updated?: string
}

// Round-trip por Date.UTC: rechaza días imposibles ("2026-02-31") que un
// regex por sí solo dejaría pasar y que `new Date()` normalizaría en silencio.
function isRealCalendarDay(value: string): boolean {
  const match = ISO_DAY.exec(value)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

// gray-matter entrega `updated: 2026-10-20` (sin comillas) como Date y
// `updated: "2026-10-20"` como string; ambos se normalizan a "YYYY-MM-DD".
// Cualquier otro valor se ignora: una fecha de modificación dudosa es peor
// que no publicarla, porque acaba en el sitemap y en el JSON-LD.
export function parseUpdatedDate(value: unknown): string | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString().slice(0, 10)
  }
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return isRealCalendarDay(trimmed) ? trimmed : undefined
}

// Única regla de "fecha de modificación": la `updated` declarada o, si no
// hay, la de publicación. Nunca se inventa una fecha.
export function postModifiedDate(post: PostDates): string {
  return post.updated ?? post.date
}
