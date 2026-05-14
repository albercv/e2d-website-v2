"use client"

/**
 * Tiny client island for the embeddings detail page. The whole detail
 * view is server-rendered; this button is the only piece that needs
 * window.confirm + fetch + router redirect.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

interface Props {
  documentId: string
  title: string
}

export function DeleteDocumentButton({ documentId, title }: Props): JSX.Element {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onClick(): Promise<void> {
    const ok = window.confirm(
      `Borrar documento "${title}" y todos sus chunks? Esta acción no se puede deshacer.`,
    )
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/embeddings/${documentId}`, { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `HTTP ${res.status}`)
        return
      }
      router.push("/admin/embeddings")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "request_failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
      <Button variant="destructive" size="sm" onClick={onClick} disabled={busy}>
        {busy ? "Borrando…" : "Borrar documento"}
      </Button>
    </div>
  )
}
