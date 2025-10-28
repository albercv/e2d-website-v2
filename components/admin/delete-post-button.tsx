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
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || "Error al borrar el post")
      }
      if (onDeleted) onDeleted()
      else router.refresh()
    } catch (e: any) {
      setError(e?.message || "No se pudo borrar")
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