"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export default function NewPostPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [locale, setLocale] = useState("es")
  const [slug, setSlug] = useState("")
  const [cover, setCover] = useState("")
  const [tags, setTags] = useState("")
  const [author, setAuthor] = useState("Alberto Carrasco")
  const [published, setPublished] = useState(true)
  const [body, setBody] = useState("\n\n")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateSlug = () => setSlug(slugify(title))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      const frontmatter = `---\n` +
        `title: "${title.replace(/"/g, '\\"')}"\n` +
        `description: "${description.replace(/"/g, '\\"')}"\n` +
        `date: "${date}"\n` +
        `locale: ${locale}\n` +
        `slug: "${slug}"\n` +
        (cover ? `cover: "${cover}"\n` : "") +
        (tagsArray.length ? `tags: [${tagsArray.map((t) => `"${t}"`).join(", ")}]\n` : "") +
        `author: "${author}"\n` +
        `published: ${published}\n` +
        `---\n\n`

      const mdx = frontmatter + body

      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, locale, mdx }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo crear el post")
      }

      window.location.href = `/admin/edit?file=${encodeURIComponent(data.file)}`
    } catch (e: any) {
      setError(e?.message || "Error creando el post")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Nuevo post</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <div className="flex gap-2">
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
                <Button type="button" variant="outline" onClick={handleGenerateSlug}>Generar</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Locale</Label>
              <select value={locale} onChange={(e) => setLocale(e.target.value)} className="border rounded-md h-10 px-3 bg-transparent">
                <option value="es">es</option>
                <option value="en">en</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descripción</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div className="space-y-2 md:col-span-2">
-              <Label>Cover (URL o ruta pública)</Label>
-              <Input value={cover} onChange={(e) => setCover(e.target.value)} />
+              <Label>Foto (URL)</Label>
+              <Input type="url" placeholder="https://..." value={cover} onChange={(e) => setCover(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Tags (separados por coma)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Autor</Label>
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={published} onCheckedChange={setPublished} id="published" />
              <Label htmlFor="published">Publicado</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contenido MDX</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[50vh] font-mono text-sm" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>{loading ? "Creando..." : "Crear"}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}