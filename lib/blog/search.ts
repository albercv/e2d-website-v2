const MAX_QUERY_LENGTH = 100

type Searchable = { title?: string; description?: string; tags?: string[] }

// Quita acentos para que "automatizacion" encuentre "Automatización".
function fold(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

export function normalizeQuery(raw: string | undefined): string {
  return (raw ?? "").trim().slice(0, MAX_QUERY_LENGTH).toLowerCase()
}

// Filtro de la lista del blog. Corre en servidor sobre TODOS los posts del
// locale, antes de paginar: el cliente solo recibe la página ya filtrada.
export function searchPosts<T extends Searchable>(posts: T[], query: string): T[] {
  const q = fold(normalizeQuery(query))
  if (!q) return posts
  return posts.filter((post) => {
    const haystack = [post.title, post.description, ...(post.tags ?? [])].filter(Boolean).join(" ")
    return fold(haystack).includes(q)
  })
}
