// lib/blog/media-meta.ts
import * as fs from "fs/promises"
import * as path from "path"

export type MediaKind = "image" | "video"

export interface MediaMetaEntry {
  ext: string
  kind: MediaKind
  alt: string
  caption: string
}

export interface MediaMeta {
  version: 1
  /**
   * Optional slug-key of the file used as the post cover. Set by the upload
   * form; takes precedence over the cover declared in MDX frontmatter when
   * resolved by `resolveCover`. Must point to an existing entry in `files`
   * with `kind: "image"`. When absent, the frontmatter cover wins.
   */
  cover?: string
  files: Record<string, MediaMetaEntry>
}

/**
 * Options for writeMeta. `cover` follows three-state semantics:
 *  - undefined  -> preserve existing top-level cover (no change)
 *  - string     -> set/override top-level cover
 *  - null       -> remove top-level cover
 */
export interface WriteMetaOptions {
  cover?: string | null
}

interface CacheEntry {
  mtimeMs: number
  meta: MediaMeta
}

const cache = new Map<string, CacheEntry>()

export function clearMediaMetaCache(): void {
  cache.clear()
}

function getRoot(): string {
  return process.env.MEDIA_UPLOADS_ROOT || path.join(process.cwd(), "public", "uploads")
}

function metaPath(key: string): string {
  return path.join(getRoot(), key, "_meta.json")
}

function lockPath(key: string): string {
  return path.join(getRoot(), key, ".lock")
}

export async function readMeta(key: string): Promise<MediaMeta> {
  const file = metaPath(key)
  let stat: import("fs").Stats
  try {
    stat = (await fs.stat(file)) as unknown as import("fs").Stats
  } catch {
    return { version: 1, files: {} }
  }
  const cached = cache.get(key)
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.meta
  const raw = await fs.readFile(file, "utf-8")
  const parsed = JSON.parse(raw) as MediaMeta
  cache.set(key, { mtimeMs: stat.mtimeMs, meta: parsed })
  return parsed
}

const LOCK_TTL_MS = 30_000

async function acquireLock(key: string): Promise<void> {
  const lock = lockPath(key)
  await fs.mkdir(path.dirname(lock), { recursive: true })
  try {
    await fs.writeFile(lock, String(Date.now()), { flag: "wx" })
    return
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err
    // Stale lock?
    try {
      const ts = Number(await fs.readFile(lock, "utf-8")) || 0
      if (Date.now() - ts > LOCK_TTL_MS) {
        await fs.rm(lock, { force: true })
        await fs.writeFile(lock, String(Date.now()), { flag: "wx" })
        return
      }
    } catch {
      // fall through
    }
    throw new Error(`media-meta: ${key} is locked by another writer`)
  }
}

async function releaseLock(key: string): Promise<void> {
  await fs.rm(lockPath(key), { force: true })
}

export async function writeMeta(
  key: string,
  newEntries: Record<string, MediaMetaEntry>,
  opts: WriteMetaOptions = {}
): Promise<MediaMeta> {
  await acquireLock(key)
  try {
    const existing = await readMeta(key)
    const merged: MediaMeta = {
      version: 1,
      files: { ...existing.files, ...newEntries },
    }
    // Three-state cover handling: explicit string sets, null clears,
    // undefined preserves whatever the existing meta had.
    if (opts.cover === null) {
      // remove (already absent in `merged`)
    } else if (typeof opts.cover === "string") {
      merged.cover = opts.cover
    } else if (existing.cover) {
      merged.cover = existing.cover
    }
    const file = metaPath(key)
    const tmp = `${file}.tmp`
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(tmp, JSON.stringify(merged, null, 2), "utf-8")
    await fs.rename(tmp, file)
    cache.delete(key)
    return merged
  } finally {
    await releaseLock(key)
  }
}

export async function deleteMetaForKey(key: string): Promise<void> {
  await fs.rm(path.join(getRoot(), key), { recursive: true, force: true })
  cache.delete(key)
}
