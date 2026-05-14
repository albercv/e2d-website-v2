"use client"

/**
 * Rebuild control panel — client island for /admin/embeddings.
 *
 * Polls GET /api/admin/embeddings every 3s while a rebuild is running so
 * the operator sees streaming progress without WebSockets. Static parent
 * page stays a Server Component.
 */

import { useCallback, useEffect, useRef, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type JobStatus = "idle" | "running" | "success" | "failed"

interface JobState {
  status: JobStatus
  startedAt: string | null
  finishedAt: string | null
  pid: number | null
  log: string[]
  exitCode: number | null
  error: string | null
}

interface ApiState extends Omit<JobState, "startedAt" | "finishedAt"> {
  startedAt: string | null
  finishedAt: string | null
}

const POLL_MS = 3000

function statusVariant(status: JobStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "running") return "default"
  if (status === "success") return "secondary"
  if (status === "failed") return "destructive"
  return "outline"
}

function normalize(raw: unknown): JobState {
  const r = raw as Partial<ApiState> | undefined
  return {
    status: (r?.status as JobStatus) ?? "idle",
    startedAt: r?.startedAt ?? null,
    finishedAt: r?.finishedAt ?? null,
    pid: r?.pid ?? null,
    log: Array.isArray(r?.log) ? r!.log : [],
    exitCode: r?.exitCode ?? null,
    error: r?.error ?? null,
  }
}

export function RebuildPanel({ initialState }: { initialState: JobState }): JSX.Element {
  const [state, setState] = useState<JobState>(initialState)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/embeddings?pageSize=10", { cache: "no-store" })
      if (!res.ok) return
      const body = await res.json()
      setState(normalize(body.jobState))
    } catch {
      // Network blip: ignore — next tick will retry.
    }
  }, [])

  useEffect(() => {
    if (state.status !== "running") {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }
    timerRef.current = setTimeout(fetchState, POLL_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [state.status, state.log.length, fetchState])

  const trigger = useCallback(
    async (full: boolean) => {
      setBusy(true)
      setError(null)
      try {
        const res = await fetch("/api/admin/embeddings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ full }),
        })
        const body = await res.json()
        if (!res.ok || body.started === false) {
          setError(body.reason ?? body.error ?? "request_failed")
        }
        setState(normalize(body.jobState))
      } catch (err) {
        setError(err instanceof Error ? err.message : "request_failed")
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const running = state.status === "running"
  const logTail = state.log.slice(-30)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Rebuild RAG index</CardTitle>
        <Badge variant={statusVariant(state.status)}>{state.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => trigger(false)} disabled={busy || running}>
            Incremental rebuild
          </Button>
          <Button size="sm" variant="outline" onClick={() => trigger(true)} disabled={busy || running}>
            Full rebuild
          </Button>
          {running ? (
            <span className="text-xs text-muted-foreground self-center">
              PID {state.pid ?? "?"} · polling every {POLL_MS / 1000}s
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span>Started: {state.startedAt ?? "—"}</span>
          <span>Finished: {state.finishedAt ?? "—"}</span>
          <span>Exit code: {state.exitCode ?? "—"}</span>
          <span>Error: {state.error ?? "—"}</span>
        </div>
        {error ? <p className="text-xs text-destructive">Error: {error}</p> : null}
        <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-2 text-[11px] leading-snug">
          {logTail.length === 0 ? "(no log output yet)" : logTail.join("\n")}
        </pre>
      </CardContent>
    </Card>
  )
}
