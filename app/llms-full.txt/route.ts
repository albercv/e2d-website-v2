import { listPostsFromDisk } from "@/lib/blog/posts-runtime"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BASE_URL = "https://evolve2digital.com"
const MAX_BYTES = 500_000 // safety guard; truncates older posts past this size

export async function GET(): Promise<Response> {
  const posts = await listPostsFromDisk()
  const published = posts
    .filter(p => p.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const chunks: string[] = []
  let bytes = 0

  for (const p of published) {
    const meta = `# ${p.title}\n\n` +
      `URL: ${BASE_URL}${p.url}\n` +
      `Locale: ${p.locale}\n` +
      `Date: ${p.date}\n` +
      (p.tags?.length ? `Tags: ${p.tags.join(", ")}\n` : "") +
      `\n`
    const piece = meta + (p.body?.raw ?? "") + "\n\n---\n\n"
    const size = Buffer.byteLength(piece, "utf-8")
    if (bytes + size > MAX_BYTES && chunks.length > 0) break
    chunks.push(piece)
    bytes += size
  }

  const body = chunks.join("")

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=600, stale-while-revalidate=3600",
    },
  })
}
