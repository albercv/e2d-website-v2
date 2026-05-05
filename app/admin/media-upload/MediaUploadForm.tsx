// app/admin/media-upload/MediaUploadForm.tsx
"use client"

import * as React from "react"
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
      // Sequential per-file upload so one failure aborts the batch.
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

  if (error && !info) return <div className="text-red-600">{error}</div>
  if (!info) return <div>Cargando…</div>
  if (done) {
    return (
      <div>
        <p className="mb-4 text-green-700">
          ✅ {done.names.length} fichero(s) subidos: <code>{done.names.join(", ")}</code>
        </p>
        <p className="text-sm text-gray-600">
          Vuelve al chat de Claude y dile al asistente los nombres para que componga el post.
        </p>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-6 rounded border border-gray-200 bg-gray-50 p-4">
        <p className="font-medium">
          translationKey: <code>{info.translationKey}</code>
        </p>
        <p className="text-sm text-gray-600">
          {info.siblings.length} post(s) hermanos: {info.siblings.map((s) => s.locale).join(", ")}
        </p>
        {info.existingMedia.length > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            Ya subidos: {info.existingMedia.map((m) => m.name).join(", ")}
          </p>
        )}
      </header>

      <input
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={(e) => addFiles(e.target.files)}
        className="mb-4 block"
      />

      {rows.map((row) => (
        <div key={row.id} className="mb-3 rounded border border-gray-200 p-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-500">{row.file.name} ({Math.round(row.file.size / 1024)} KB)</p>
              <label className="mt-2 block text-xs">Nombre</label>
              <input
                value={row.name}
                onChange={(e) => updateRow(row.id, { name: e.target.value })}
                onBlur={(e) => {
                  try {
                    updateRow(row.id, { name: slugifyMediaName(e.target.value) })
                  } catch {
                    /* leave as-is, validate() will catch */
                  }
                }}
                className="w-full border px-2 py-1 text-sm"
              />
              <label className="mt-2 block text-xs">Alt</label>
              <input
                value={row.alt}
                onChange={(e) => updateRow(row.id, { alt: e.target.value })}
                className="w-full border px-2 py-1 text-sm"
              />
              <label className="mt-2 block text-xs">Caption</label>
              <input
                value={row.caption}
                onChange={(e) => updateRow(row.id, { caption: e.target.value })}
                className="w-full border px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-gray-500">{row.status}</span>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="text-xs text-red-600 underline"
              >
                quitar
              </button>
            </div>
          </div>
          {row.error && <p className="mt-1 text-xs text-red-600">{row.error}</p>}
        </div>
      ))}

      {error && <p className="mb-3 text-red-600">{error}</p>}

      <button
        type="button"
        disabled={submitting || rows.length === 0}
        onClick={submit}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? "Subiendo…" : "Subir todo"}
      </button>
    </div>
  )
}
