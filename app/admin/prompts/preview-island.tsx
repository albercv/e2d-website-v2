"use client"

/**
 * Admin: preview pane for the system prompt editor.
 *
 * Renders the supplied body against an optional sample query and a small
 * set of fake retrieved chunks via POST /api/admin/prompts/preview, then
 * shows the assembled prompt verbatim in a <pre>. No DB writes; the body
 * shown is exactly what `buildSystemPrompt` would produce in runtime.
 */

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  locale: "es" | "en" | "it"
  initialBody: string
}

interface SampleChunk {
  title: string
  url: string
  content: string
}

const SAMPLE_CHUNKS: SampleChunk[] = [
  {
    title: "Servicios E2D",
    url: "https://evolve2digital.com/servicios",
    content:
      "Desarrollo de software a medida, automatización de procesos y soluciones de IA aplicadas.",
  },
]

export default function PreviewIsland({ locale, initialBody }: Props): JSX.Element {
  const [body, setBody] = useState(initialBody)
  const [sampleQuery, setSampleQuery] = useState("")
  const [rendered, setRendered] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPreview(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/prompts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          body,
          sampleQuery: sampleQuery || undefined,
          sampleChunks: SAMPLE_CHUNKS,
        }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? `HTTP ${res.status}`)
      }
      const payload = (await res.json()) as { rendered: string }
      setRendered(payload.rendered)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-4">
      <div className="grid gap-2">
        <Label htmlFor="preview-body">Cuerpo a previsualizar</Label>
        <Textarea
          id="preview-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-40 font-mono text-xs"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="preview-query">Consulta de ejemplo (opcional)</Label>
        <input
          id="preview-query"
          value={sampleQuery}
          onChange={(e) => setSampleQuery(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" onClick={onPreview} disabled={busy} size="sm">
          {busy ? "Renderizando…" : "Previsualizar"}
        </Button>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
      {rendered ? (
        <pre className="whitespace-pre-wrap rounded-md bg-background p-3 text-xs leading-relaxed border max-h-96 overflow-auto">
          {rendered}
        </pre>
      ) : null}
    </div>
  )
}
