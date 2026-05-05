// app/admin/media-upload/MediaUploadForm.tsx
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, Loader2, Trash2, Upload, Image as ImageIcon, Video } from "lucide-react"
import { slugifyMediaName } from "@/lib/blog/media-naming"

interface ExistingItem {
  name: string
  kind: "image" | "video"
  ext: string
  alt: string
  caption: string
  url: string
}

interface TokenInfo {
  translationKey: string
  siblings: Array<{ slug: string; locale: string; title: string }>
  existingMedia: ExistingItem[]
  expiresAt: number
}

interface Row {
  id: string
  file: File
  name: string
  alt: string
  caption: string
  status: "idle" | "uploading" | "ok" | "error"
  error?: string
}

function StatusPill({ status }: { status: Row["status"] }) {
  if (status === "idle") return null
  if (status === "uploading") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Subiendo
      </Badge>
    )
  }
  if (status === "ok") {
    return (
      <Badge className="gap-1 bg-[#05b4ba]/15 text-[#05b4ba] hover:bg-[#05b4ba]/15">
        <CheckCircle2 className="h-3 w-3" />
        OK
      </Badge>
    )
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertCircle className="h-3 w-3" />
      Error
    </Badge>
  )
}

function fileIcon(file: File) {
  if (file.type.startsWith("video/")) return <Video className="h-4 w-4 text-muted-foreground" />
  return <ImageIcon className="h-4 w-4 text-muted-foreground" />
}

export function MediaUploadForm() {
  const [token, setToken] = React.useState<string | null>(null)
  const [info, setInfo] = React.useState<TokenInfo | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [rows, setRows] = React.useState<Row[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [done, setDone] = React.useState<{ names: string[] } | null>(null)

  React.useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token")
    if (!t) {
      setError("No hay token en la URL.")
      return
    }
    setToken(t)
    fetch(`/api/admin/media/token-info?token=${encodeURIComponent(t)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as TokenInfo
      })
      .then(setInfo)
      .catch((e: Error) => setError(`Token inválido o expirado (${e.message}).`))
  }, [])

  function addFiles(files: FileList | null) {
    if (!files) return
    const next: Row[] = Array.from(files).map((file) => {
      const base = file.name.replace(/\.[^.]+$/, "")
      let name = ""
      try {
        name = slugifyMediaName(base)
      } catch {
        name = ""
      }
      return {
        id: crypto.randomUUID(),
        file,
        name,
        alt: "",
        caption: "",
        status: "idle",
      }
    })
    setRows((r) => [...r, ...next])
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function removeRow(id: string) {
    setRows((r) => r.filter((row) => row.id !== id))
  }

  function validate(): string | null {
    if (rows.length === 0) return "Añade al menos un fichero."
    const names = new Set<string>(info?.existingMedia.map((m) => m.name) || [])
    for (const r of rows) {
      if (!r.name) return `Falta el nombre para ${r.file.name}.`
      try {
        if (slugifyMediaName(r.name) !== r.name) {
          return `Nombre no normalizado: ${r.name}`
        }
      } catch {
        return `Nombre vacío para ${r.file.name}.`
      }
      if (names.has(r.name)) return `El nombre "${r.name}" ya existe.`
      names.add(r.name)
    }
    return null
  }

  async function submit() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setSubmitting(true)
    if (!token) return
    try {
      for (const row of rows) {
        updateRow(row.id, { status: "uploading" })
        const res = await fetch("/api/admin/media/upload", {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": row.file.type,
            "x-media-name": row.name,
          },
          body: row.file,
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          updateRow(row.id, { status: "error", error: data.error || `HTTP ${res.status}` })
          throw new Error(`Falla en ${row.name}: ${data.error || res.status}`)
        }
        updateRow(row.id, { status: "ok" })
      }
      const commitRes = await fetch("/api/admin/media/upload/commit", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          files: rows.map((r) => ({ name: r.name, alt: r.alt, caption: r.caption })),
        }),
      })
      if (!commitRes.ok) {
        const data = (await commitRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(`Commit falló: ${data.error || commitRes.status}`)
      }
      setDone({ names: rows.map((r) => r.name) })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (error && !info) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            No se pudo cargar el contexto
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!info) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando contexto del post…
        </CardContent>
      </Card>
    )
  }

  if (done) {
    return (
      <Card className="border-[#05b4ba]/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <CheckCircle2 className="h-5 w-5 text-[#05b4ba]" />
            {done.names.length} fichero{done.names.length === 1 ? "" : "s"} subidos
          </CardTitle>
          <CardDescription>
            Vuelve al chat de Claude y dile al asistente los nombres para que componga el post.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {done.names.map((n) => (
              <code
                key={n}
                className="rounded border border-border bg-muted px-2 py-1 font-mono text-xs text-foreground"
              >
                {n}
              </code>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">Contexto del post</CardTitle>
          <CardDescription className="space-y-1">
            <span className="block">
              translationKey:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                {info.translationKey}
              </code>
            </span>
            <span className="block">
              {info.siblings.length} post{info.siblings.length === 1 ? "" : "s"} hermano{info.siblings.length === 1 ? "" : "s"}
              {info.siblings.length > 0 && (
                <> ({info.siblings.map((s) => s.locale).join(", ")})</>
              )}
            </span>
          </CardDescription>
        </CardHeader>
        {info.existingMedia.length > 0 && (
          <CardContent className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ya subidos
            </p>
            <div className="flex flex-wrap gap-2">
              {info.existingMedia.map((m) => (
                <Badge key={m.name} variant="secondary" className="gap-1 font-mono text-xs">
                  {m.kind === "video" ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                  {m.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">
            Añadir ficheros
          </CardTitle>
          <CardDescription>
            Imágenes (jpg, png, webp, gif) y vídeos (mp4, mov, webm). Los nombres se normalizan a slug-keys.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label
            htmlFor="file-input"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-[#05b4ba]/60 hover:bg-muted/50 hover:text-foreground"
          >
            <Upload className="h-4 w-4" />
            Click para seleccionar (puedes elegir varios)
          </Label>
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => addFiles(e.target.files)}
            className="hidden"
          />
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {fileIcon(row.file)}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{row.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(row.file.size / 1024 / 1024).toFixed(2)} MB · {row.file.type || "tipo desconocido"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={row.status} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(row.id)}
                      disabled={submitting}
                      aria-label="Quitar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`name-${row.id}`}>Nombre (slug-key)</Label>
                    <Input
                      id={`name-${row.id}`}
                      value={row.name}
                      onChange={(e) => updateRow(row.id, { name: e.target.value })}
                      onBlur={(e) => {
                        try {
                          updateRow(row.id, { name: slugifyMediaName(e.target.value) })
                        } catch {
                          /* validate() lo recoge */
                        }
                      }}
                      placeholder="hero, fachada, testimonio…"
                      disabled={submitting}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`alt-${row.id}`}>Alt (accesibilidad)</Label>
                    <Input
                      id={`alt-${row.id}`}
                      value={row.alt}
                      onChange={(e) => updateRow(row.id, { alt: e.target.value })}
                      placeholder="Descripción para lectores de pantalla"
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor={`caption-${row.id}`}>Caption (opcional)</Label>
                    <Input
                      id={`caption-${row.id}`}
                      value={row.caption}
                      onChange={(e) => updateRow(row.id, { caption: e.target.value })}
                      placeholder="Texto al pie"
                      disabled={submitting}
                    />
                  </div>
                </div>

                {row.error && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {row.error}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          {rows.length === 0
            ? "Sin ficheros seleccionados"
            : `${rows.length} fichero${rows.length === 1 ? "" : "s"} listo${rows.length === 1 ? "" : "s"} para subir`}
        </p>
        <Button
          type="button"
          onClick={submit}
          disabled={submitting || rows.length === 0}
          className="bg-[#05b4ba] text-white hover:bg-[#05b4ba]/90"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Subiendo…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Subir todo
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
