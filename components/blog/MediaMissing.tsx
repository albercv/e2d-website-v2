"use client"

import * as React from "react"

interface Props {
  kind: "image" | "video"
  name: string
  reason?: "not_found" | "kind_mismatch"
}

export function MediaMissing({ kind, name, reason }: Props) {
  const isDev = process.env.NODE_ENV !== "production"
  return (
    <div
      role="img"
      aria-label={`Media missing: ${name}`}
      className="my-6 flex items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500"
    >
      <span>
        ⚠️ media missing: <code>{name}</code> ({kind})
        {isDev && reason ? ` — ${reason}` : null}
      </span>
    </div>
  )
}
