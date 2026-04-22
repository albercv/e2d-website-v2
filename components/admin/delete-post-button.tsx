"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function DeletePostButton({ file, onDeleted }: { file: string; onDeleted?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm("¿Seguro que quieres borrar este post?")) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/posts?file=${encodeURIComponent(file)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}))
        const obj = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {}
        const msg = typeof obj.error === "string" ? obj.error : "Error al borrar el post"
        throw new Error(msg)
      }
      if (onDeleted) onDeleted()
      else router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo borrar"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
        {loading ? "Borrando..." : "Borrar"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
