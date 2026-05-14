// In-memory sliding-window rate limiter keyed by visitorId.
// Per-process — swap to Redis if scaled horizontally.

import type { RateLimitResult } from './types'

const WINDOW_MS = 60 * 60 * 1000 // 1 hour
const DEFAULT_LIMIT = 30
const MAX_TRACKED_KEYS = 10_000

const hits = new Map<string, number[]>()

function readLimit(): number {
  const raw = process.env.CHAT_RATE_LIMIT_PER_HOUR
  if (!raw) return DEFAULT_LIMIT
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LIMIT
}

function prune(timestamps: number[], cutoff: number): number[] {
  // timestamps are appended in chronological order — find first kept idx.
  let i = 0
  while (i < timestamps.length && timestamps[i] <= cutoff) i++
  return i === 0 ? timestamps : timestamps.slice(i)
}

function evictStaleKeys(cutoff: number): void {
  // Iterate once; entries whose newest timestamp is older than the window go.
  for (const [key, stamps] of hits) {
    if (stamps.length === 0 || stamps[stamps.length - 1] <= cutoff) {
      hits.delete(key)
    }
  }
}

export function checkRate(visitorId: string): RateLimitResult {
  const limit = readLimit()
  const now = Date.now()
  const cutoff = now - WINDOW_MS
  const existing = hits.get(visitorId) ?? []
  const recent = prune(existing, cutoff)

  if (recent.length >= limit) {
    // Over the limit — do NOT record this attempt against the window.
    hits.set(visitorId, recent)
    const oldest = recent[0]
    const retryAfterSec = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000))
    return { allowed: false, remaining: 0, retryAfterSec }
  }

  recent.push(now)
  hits.set(visitorId, recent)

  if (hits.size > MAX_TRACKED_KEYS) {
    evictStaleKeys(cutoff)
  }

  return { allowed: true, remaining: Math.max(0, limit - recent.length) }
}
