"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface ChatTurn {
  id: string
  role: "user" | "assistant"
  content: string
  pending?: boolean
}

export type ChatError = "rate-limit" | "network" | "server" | null

export interface UseChatStream {
  messages: ChatTurn[]
  send: (text: string) => Promise<void>
  reset: () => void
  isStreaming: boolean
  error: ChatError
}

export interface UseChatStreamOptions {
  locale: string
  sessionStorageKey?: string
}

const DEFAULT_STORAGE_KEY = "e2d_chat_history"

// Generates a short opaque id; crypto.randomUUID would also work but we keep it
// minimal so the hook does not depend on browser feature checks.
function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function readStored(key: string): ChatTurn[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (t): t is ChatTurn =>
        typeof t === "object" &&
        t !== null &&
        typeof (t as ChatTurn).id === "string" &&
        ((t as ChatTurn).role === "user" || (t as ChatTurn).role === "assistant") &&
        typeof (t as ChatTurn).content === "string",
    )
  } catch {
    // Corrupted entry — start fresh, do not surface to the user.
    return []
  }
}

function writeStored(key: string, turns: ChatTurn[]): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(turns))
  } catch {
    // Quota or privacy-mode failures are not fatal for in-memory chat.
  }
}

// Parses raw SSE chunks into plain text fragments. Yields data payloads only,
// skipping `[DONE]` sentinels and comments. Mirrors the server contract:
// `data: <fragment>\n\n`. Multi-line `data:` events are joined with `\n`.
function* parseSseChunk(buffer: string): IterableIterator<string> {
  const events = buffer.split("\n\n")
  for (const evt of events) {
    if (!evt.trim()) continue
    const dataLines = evt
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).replace(/^ /, ""))
    if (dataLines.length === 0) continue
    const payload = dataLines.join("\n")
    if (payload === "[DONE]") continue
    yield payload
  }
}

export function useChatStream(opts: UseChatStreamOptions): UseChatStream {
  const storageKey = opts.sessionStorageKey ?? DEFAULT_STORAGE_KEY
  const [messages, setMessages] = useState<ChatTurn[]>(() => readStored(storageKey))
  const [error, setError] = useState<ChatError>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    writeStored(storageKey, messages)
  }, [messages, storageKey])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const removePending = useCallback((pendingId: string) => {
    setMessages((prev) => prev.filter((t) => t.id !== pendingId))
  }, [])

  const appendFragment = useCallback((pendingId: string, fragment: string) => {
    setMessages((prev) =>
      prev.map((t) => (t.id === pendingId ? { ...t, content: t.content + fragment } : t)),
    )
  }, [])

  const finalizePending = useCallback((pendingId: string) => {
    setMessages((prev) =>
      prev.map((t) => (t.id === pendingId ? { ...t, pending: false } : t)),
    )
  }, [])

  const consumeStream = useCallback(
    async (response: Response, pendingId: string): Promise<void> => {
      const body = response.body
      if (!body) {
        finalizePending(pendingId)
        return
      }
      const reader = body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      // We intentionally keep the last (possibly partial) event in `buffer` and
      // only flush complete `\n\n`-terminated events.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lastSep = buffer.lastIndexOf("\n\n")
        if (lastSep === -1) continue
        const ready = buffer.slice(0, lastSep + 2)
        buffer = buffer.slice(lastSep + 2)
        for (const fragment of parseSseChunk(ready)) appendFragment(pendingId, fragment)
      }
      if (buffer.length > 0) {
        for (const fragment of parseSseChunk(buffer)) appendFragment(pendingId, fragment)
      }
      finalizePending(pendingId)
    },
    [appendFragment, finalizePending],
  )

  const send = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim()
      if (!trimmed) return
      setError(null)
      const userTurn: ChatTurn = { id: makeId(), role: "user", content: trimmed }
      const pending: ChatTurn = { id: makeId(), role: "assistant", content: "", pending: true }
      setMessages((prev) => [...prev, userTurn, pending])

      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({ chatInput: trimmed, metadata: { locale: opts.locale } }),
          signal: ctrl.signal,
        })
        if (response.status === 429) {
          setError("rate-limit")
          removePending(pending.id)
          return
        }
        if (!response.ok) {
          setError("server")
          removePending(pending.id)
          return
        }
        await consumeStream(response, pending.id)
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return
        setError("network")
        removePending(pending.id)
      }
    },
    [consumeStream, opts.locale, removePending],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setError(null)
    setMessages([])
  }, [])

  const isStreaming = messages.some((t) => t.pending)
  return { messages, send, reset, isStreaming, error }
}
