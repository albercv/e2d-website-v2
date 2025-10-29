"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import matter from "gray-matter"

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

type PostFrontmatter = {
  title: string
  description: string
  date: string
  locale: string
  slug: string
  cover?: string
  tags: string[]
  author: string
  published: boolean
}

export function AdminMdxEditor({ file, initial }: { file: string; initial: string }) {
  const router = useRouter()
  const [currentFile, setCurrentFile] = useState(file)
  const parsed = useMemo(() => matter(initial), [initial])

  const [post, setPost] = useState<PostFrontmatter>(() => {
    const d: any = parsed.data || {}
    const rawDate = d.date
    const dateStr = typeof rawDate === "string"
      ? rawDate
      : rawDate ? new Date(rawDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)

    return {
      title: d.title || "",
      description: d.description || "",
      date: dateStr,
      locale: d.locale || "es",
      slug: d.slug || "",
      cover: d.cover || "",
      tags: Array.isArray(d.tags)
        ? d.tags
        : typeof d.tags === "string"
          ? d.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : [],
      author: d.author || "Alberto Carrasco",
      published: typeof d.published === "boolean" ? d.published : true,
    }
  })

  const [body, setBody] = useState<string>(parsed.content || "\n\n")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateSlug = () => setPost((p) => ({ ...p, slug: slugify(p.title) }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const fm: any = {
        title: post.title,
        description: post.description,
        date: post.date,
        locale: post.locale,
        slug: post.slug,
        author: post.author,
        published: post.published,
      }
      if (post.cover) fm.cover = post.cover
      if (post.tags && post.tags.length) fm.tags = post.tags

      const mdx = matter.stringify(body, fm)

      const res = await fetch("/api/admin/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: currentFile, mdx }),
      })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        throw new Error((data && (data.error as string)) || "Error al guardar")
      }
      if (data?.file && data.file !== currentFile) {
        setCurrentFile(data.file)
        router.replace(`/admin/edit?file=${encodeURIComponent(data.file)}`)
        setMessage("Guardado y renombrado correctamente")
      } else {
        setMessage("Guardado correctamente")
      }
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Editar post</h1>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={post.title} onChange={(e) => setPost((p) => ({ ...p, title: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <div className="flex gap-2">
                <Input value={post.slug} onChange={(e) => setPost((p) => ({ ...p, slug: e.target.value }))} required />
                <Button type="button" variant="outline" onClick={handleGenerateSlug}>Generar</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={post.date} onChange={(e) => setPost((p) => ({ ...p, date: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Locale</Label>
              <select value={post.locale} onChange={(e) => setPost((p) => ({ ...p, locale: e.target.value }))} className="border rounded-md h-10 px-3 bg-transparent">
                <option value="es">es</option>
                <option value="en">en</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descripción</Label>
              <Input value={post.description} onChange={(e) => setPost((p) => ({ ...p, description: e.target.value }))} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Foto (URL)</Label>
              <Input type="url" placeholder="https://..." value={post.cover || ""} onChange={(e) => setPost((p) => ({ ...p, cover: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Tags (separados por coma)</Label>
              <Input
                value={post.tags.join(", ")}
                onChange={(e) =>
                  setPost((p) => ({
                    ...p,
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Autor</Label>
              <Input value={post.author} onChange={(e) => setPost((p) => ({ ...p, author: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={post.published} onCheckedChange={(v) => setPost((p) => ({ ...p, published: v }))} id="published" />
              <Label htmlFor="published">Publicado</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contenido MDX</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[50vh] font-mono text-sm" />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            {message && <span className="text-sm text-emerald-600">{message}</span>}
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}