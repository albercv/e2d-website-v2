import type { NextRequest } from "next/server"

// Las tres rutas /api/cron/* comparten el mismo bearer (CRON_SECRET del crontab).
export function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return request.headers.get("authorization") === `Bearer ${cronSecret}`
}
