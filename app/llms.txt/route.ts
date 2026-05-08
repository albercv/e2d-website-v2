import { listPostsFromDisk } from "@/lib/blog/posts-runtime"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BASE_URL = "https://evolve2digital.com"

const HEADER = `# E2D — Evolve2Digital

> Automatización empresarial con IA: agentes de voz, chatbots WhatsApp y workflows que liberan horas a equipos de PYMEs y mid-market en clínicas, inmobiliarias y asesorías.

E2D es una boutique de implementación. Construimos automatizaciones a medida con un loop corto: medimos el tiempo perdido en una tarea, prototipamos en días, desplegamos y monitorizamos.

`

const STATIC_SECTIONS = `## Sitio principal

- [Inicio (es)](${BASE_URL}/es): página principal en español
- [Home (en)](${BASE_URL}/en): English landing page
- [Home (it)](${BASE_URL}/it): pagina principale in italiano

## Documentación

- [Principios](${BASE_URL}/es/docs/principles)
- [Arquitectura](${BASE_URL}/es/docs/architecture)
- [Seguridad](${BASE_URL}/es/docs/security)
- [Performance](${BASE_URL}/es/docs/performance)
- [Despliegue](${BASE_URL}/es/docs/deployment)
- [GDPR](${BASE_URL}/es/docs/gdpr)

`

export async function GET(): Promise<Response> {
  const posts = await listPostsFromDisk()
  const published = posts
    .filter(p => p.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const blogLines = published
    .map(p => {
      const title = p.title.replace(/\]/g, "")
      const desc = p.description ? `: ${p.description}` : ""
      return `- [${title}](${BASE_URL}${p.url})${desc}`
    })
    .join("\n")

  const blogSection = `## Blog\n\n${blogLines || "_(sin posts publicados aún)_"}\n`

  const body = HEADER + STATIC_SECTIONS + blogSection

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=600, stale-while-revalidate=3600",
    },
  })
}
