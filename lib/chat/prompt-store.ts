/**
 * DB-backed loader for the chat agent's system prompt body, per locale.
 *
 * Rationale: the runtime prompt builder (lib/chat/prompt.ts) used to ship a
 * hardcoded template per locale. To let admins iterate without a redeploy
 * we now keep editable, versioned bodies in the `system_prompts` table.
 *
 * This module owns:
 *   - The async DB read used by admin endpoints to refresh the cache after
 *     a write (`loadActivePromptBody`).
 *   - A synchronous accessor (`peekCachedPromptBody`) so the runtime
 *     `buildSystemPrompt` stays sync and never blocks on a DB round-trip.
 *   - Version management (list / create / activate) with cache invalidation.
 *
 * On a cold cache the runtime falls back to the hardcoded template kept in
 * lib/chat/prompt.ts, while a non-blocking refresh populates the cache for
 * subsequent requests. Any DB failure also resolves to the fallback path.
 */

import { and, desc, eq, max, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { systemPrompts, type SystemPrompt } from "@/lib/db/schema";
import type { Locale } from "@/lib/chat/types";

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  body: string | null;
  loadedAt: number;
}

const cache = new Map<Locale, CacheEntry>();
const inflight = new Map<Locale, Promise<string | null>>();

export interface PromptVersion {
  id: string;
  locale: Locale;
  version: number;
  body: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  isActive: boolean;
}

function toVersion(row: SystemPrompt): PromptVersion {
  return {
    id: row.id,
    locale: row.locale as Locale,
    version: row.version,
    body: row.body,
    notes: row.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    isActive: row.isActive,
  };
}

function isFresh(entry: CacheEntry | undefined): entry is CacheEntry {
  if (!entry) return false;
  return Date.now() - entry.loadedAt < CACHE_TTL_MS;
}

async function fetchActiveBody(locale: Locale): Promise<string | null> {
  const rows = await db
    .select({ body: systemPrompts.body })
    .from(systemPrompts)
    .where(
      and(eq(systemPrompts.locale, locale), eq(systemPrompts.isActive, true)),
    )
    .limit(1);
  return rows[0]?.body ?? null;
}

/**
 * Async load + cache. Used by admin endpoints after a write so the
 * cache is warm before the next chat request lands. Returns null when no
 * active version exists; caller falls back to the hardcoded template.
 */
export async function loadActivePromptBody(
  locale: Locale,
): Promise<string | null> {
  const cached = cache.get(locale);
  if (isFresh(cached)) return cached.body;

  const existing = inflight.get(locale);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const body = await fetchActiveBody(locale);
      cache.set(locale, { body, loadedAt: Date.now() });
      return body;
    } catch (err) {
      // DB unreachable → keep last known cache if we have one, otherwise null.
      // Never throw: callers fall back to the hardcoded template.
      console.error(
        "[prompt-store] loadActivePromptBody failed:",
        (err as Error).message,
      );
      return cache.get(locale)?.body ?? null;
    } finally {
      inflight.delete(locale);
    }
  })();
  inflight.set(locale, promise);
  return promise;
}

/**
 * Synchronous cache lookup for the runtime hot path. Never touches the DB.
 * Returns null on miss; the caller (buildSystemPrompt) falls back to the
 * hardcoded template and triggers a background refresh.
 */
export function peekCachedPromptBody(locale: Locale): string | null {
  const entry = cache.get(locale);
  return isFresh(entry) ? entry.body : null;
}

/**
 * Fire-and-forget refresh used by buildSystemPrompt when the cache is cold.
 * Errors are swallowed; loadActivePromptBody handles its own logging.
 */
export function refreshPromptCacheInBackground(locale: Locale): void {
  if (inflight.has(locale)) return;
  void loadActivePromptBody(locale).catch(() => {
    // Already logged inside loadActivePromptBody.
  });
}

/**
 * Drop one or all cache entries. Called from the admin endpoints right
 * after create/activate so the next read sees the new state.
 */
export function invalidatePromptCache(locale?: Locale): void {
  if (locale) {
    cache.delete(locale);
    return;
  }
  cache.clear();
}

export async function listVersions(locale: Locale): Promise<PromptVersion[]> {
  const rows = await db
    .select()
    .from(systemPrompts)
    .where(eq(systemPrompts.locale, locale))
    .orderBy(desc(systemPrompts.version));
  return rows.map(toVersion);
}

async function nextVersionNumber(locale: Locale): Promise<number> {
  const result = await db
    .select({ maxVersion: max(systemPrompts.version) })
    .from(systemPrompts)
    .where(eq(systemPrompts.locale, locale));
  const current = result[0]?.maxVersion;
  return (current ?? 0) + 1;
}

export async function createVersion(
  locale: Locale,
  body: string,
  notes?: string,
): Promise<PromptVersion> {
  if (body.trim().length === 0) {
    throw new Error("prompt body cannot be empty");
  }
  const version = await nextVersionNumber(locale);
  const inserted = await db
    .insert(systemPrompts)
    .values({
      locale,
      version,
      body,
      notes: notes ?? null,
      isActive: false,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error("failed to insert prompt version");
  // No cache invalidation: a new draft does not affect the active body.
  return toVersion(row);
}

export async function activateVersion(
  locale: Locale,
  version: number,
): Promise<PromptVersion> {
  const row = await db.transaction(async (tx) => {
    await tx
      .update(systemPrompts)
      .set({ isActive: false })
      .where(
        and(eq(systemPrompts.locale, locale), eq(systemPrompts.isActive, true)),
      );
    const updated = await tx
      .update(systemPrompts)
      .set({ isActive: true })
      .where(
        and(
          eq(systemPrompts.locale, locale),
          eq(systemPrompts.version, version),
        ),
      )
      .returning();
    if (updated.length === 0) {
      throw new Error(`version ${version} not found for locale ${locale}`);
    }
    return updated[0];
  });
  invalidatePromptCache(locale);
  // Pre-warm so the next chat request sees the new body without waiting.
  await loadActivePromptBody(locale).catch(() => null);
  return toVersion(row);
}

/**
 * Lightweight summary used by the list endpoint. Returns one row per
 * locale we have any version for, with the active version (or null).
 * Locales never seen before are omitted; the UI fills in the gaps.
 */
export interface LocaleSummary {
  locale: Locale;
  activeVersion: number | null;
  lastUpdated: string | null;
  totalVersions: number;
}

export async function summarizeByLocale(): Promise<LocaleSummary[]> {
  const rows = await db.execute<{
    locale: string;
    active_version: number | null;
    last_updated: Date | null;
    total_versions: number;
  }>(sql`
    SELECT locale,
           MAX(version) FILTER (WHERE is_active) AS active_version,
           MAX(created_at) AS last_updated,
           COUNT(*)::int AS total_versions
    FROM system_prompts
    GROUP BY locale
    ORDER BY locale
  `);
  const list = rows as unknown as Array<{
    locale: string;
    active_version: number | null;
    last_updated: Date | string | null;
    total_versions: number | string;
  }>;
  return list.map((r) => ({
    locale: r.locale as Locale,
    activeVersion:
      r.active_version === null ? null : Number(r.active_version),
    lastUpdated:
      r.last_updated instanceof Date
        ? r.last_updated.toISOString()
        : (r.last_updated ?? null),
    totalVersions: Number(r.total_versions ?? 0),
  }));
}
