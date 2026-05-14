"use client"

/**
 * Admin: RAG embeddings — interactive retrieval tester.
 *
 * Full client component on purpose: the operator types a query, picks a
 * locale and top-K, and we POST to /api/admin/embeddings/search. Round-
 * trip latency is measured client-side so the operator can compare
 * embedding+SQL cost across queries without instrumenting the server.
 */

import { useCallback, useState } from "react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

type Locale = "es" | "en" | "it"

interface SearchResult {
  id: string
  documentId: string
  source: string
  sourceRef: string
  title: string
  url: string
  content: string
  similarity: number
}

interface SearchResponse {
  results?: SearchResult[]
  error?: string
}

function ResultPreview({ content }: { content: string }): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const preview = content.slice(0, 300)
  const truncated = content.length > preview.length
  return (
    <div className="text-xs leading-relaxed">
      <p className="whitespace-pre-wrap">
        {expanded || !truncated ? content : `${preview}…`}
      </p>
      {truncated ? (
        <button
          type="button"
          className="underline text-muted-foreground mt-1"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      ) : null}
    </div>
  )
}

function ResultCard({ result }: { result: SearchResult }): JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm">
            <Link href={`/admin/embeddings/${result.documentId}`} className="underline">
              {result.title || "(no title)"}
            </Link>
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            sim {result.similarity.toFixed(4)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
          <Badge variant="secondary">{result.source}</Badge>
          <span className="font-mono">{result.sourceRef}</span>
          {result.url ? (
            <a href={result.url} className="underline" target="_blank" rel="noreferrer">
              link
            </a>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <ResultPreview content={result.content} />
      </CardContent>
    </Card>
  )
}

interface RunState {
  results: SearchResult[]
  latencyMs: number | null
  error: string | null
}

const INITIAL_RUN: RunState = { results: [], latencyMs: null, error: null }

export default function AdminEmbeddingsSearchPage(): JSX.Element {
  const [query, setQuery] = useState("")
  const [locale, setLocale] = useState<Locale>("es")
  const [topK, setTopK] = useState(5)
  const [busy, setBusy] = useState(false)
  const [run, setRun] = useState<RunState>(INITIAL_RUN)

  const submit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (query.trim().length === 0) return
      setBusy(true)
      setRun(INITIAL_RUN)
      const t0 = performance.now()
      try {
        const res = await fetch("/api/admin/embeddings/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query, locale, topK }),
        })
        const body = (await res.json()) as SearchResponse
        const latencyMs = Math.round(performance.now() - t0)
        if (!res.ok) {
          setRun({ results: [], latencyMs, error: body.error ?? `HTTP ${res.status}` })
          return
        }
        setRun({ results: body.results ?? [], latencyMs, error: null })
      } catch (err) {
        setRun({
          results: [],
          latencyMs: Math.round(performance.now() - t0),
          error: err instanceof Error ? err.message : "request_failed",
        })
      } finally {
        setBusy(false)
      }
    },
    [query, locale, topK],
  )

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Interactive retrieval test</h1>
        <Link href="/admin/embeddings" className="text-sm underline">
          ← Back to documents
        </Link>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label htmlFor="query">Query</Label>
              <textarea
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={3}
                maxLength={2000}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="¿Cómo automatizamos onboarding con n8n?"
              />
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <Label htmlFor="locale">Locale</Label>
                <select
                  id="locale"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as Locale)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="es">es</option>
                  <option value="en">en</option>
                  <option value="it">it</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 w-24">
                <Label htmlFor="topK">top-K</Label>
                <Input
                  id="topK"
                  type="number"
                  min={1}
                  max={20}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value) || 5)}
                />
              </div>
              <Button type="submit" disabled={busy || query.trim().length === 0}>
                {busy ? "Searching…" : "Search"}
              </Button>
              {run.latencyMs !== null ? (
                <span className="text-xs text-muted-foreground ml-auto">
                  {run.latencyMs} ms
                </span>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
      {run.error ? (
        <p className="text-sm text-destructive">Error: {run.error}</p>
      ) : null}
      {run.results.length > 0 ? (
        <div className="space-y-3">
          {run.results.map((r) => (
            <ResultCard key={r.id} result={r} />
          ))}
        </div>
      ) : !busy && run.latencyMs !== null && !run.error ? (
        <p className="text-sm text-muted-foreground">No results.</p>
      ) : null}
    </div>
  )
}
