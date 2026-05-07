// __tests__/lib/media-meta.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import {
  readMeta,
  writeMeta,
  clearMediaMetaCache,
  type MediaMeta,
  type MediaMetaEntry,
} from "@/lib/blog/media-meta"

describe("media-meta", () => {
  let tmp: string
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mm-"))
    process.env.MEDIA_UPLOADS_ROOT = tmp
    clearMediaMetaCache()
  })
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.MEDIA_UPLOADS_ROOT
  })

  it("returns empty when no _meta.json exists", async () => {
    const meta = await readMeta("ferdy")
    expect(meta).toEqual({ version: 1, files: {} })
  })

  it("writes and reads back a meta entry", async () => {
    const entry: MediaMetaEntry = { ext: "jpg", kind: "image", alt: "A", caption: "" }
    await writeMeta("ferdy", { fachada: entry })
    const meta = await readMeta("ferdy")
    expect(meta.files.fachada).toEqual(entry)
  })

  it("merges new entries with existing ones on writeMeta", async () => {
    await writeMeta("ferdy", {
      fachada: { ext: "jpg", kind: "image", alt: "A", caption: "" },
    })
    await writeMeta("ferdy", {
      mesa: { ext: "png", kind: "image", alt: "M", caption: "" },
    })
    const meta = await readMeta("ferdy")
    expect(Object.keys(meta.files).sort()).toEqual(["fachada", "mesa"])
  })

  it("invalidates the in-memory cache when the file mtime changes", async () => {
    await writeMeta("ferdy", { a: { ext: "jpg", kind: "image", alt: "", caption: "" } })
    await readMeta("ferdy") // populates cache

    // External modification (simulates another process)
    const file = path.join(tmp, "ferdy", "_meta.json")
    const data: MediaMeta = {
      version: 1,
      files: { a: { ext: "jpg", kind: "image", alt: "", caption: "" }, b: { ext: "png", kind: "image", alt: "", caption: "" } },
    }
    // Wait briefly so mtime increments on filesystems with low resolution
    await new Promise((r) => setTimeout(r, 20))
    fs.writeFileSync(file, JSON.stringify(data))

    const meta = await readMeta("ferdy")
    expect(Object.keys(meta.files).sort()).toEqual(["a", "b"])
  })

  it("rejects concurrent writeMeta on the same key", async () => {
    const slow: Promise<void> = writeMeta("ferdy", {
      a: { ext: "jpg", kind: "image", alt: "", caption: "" },
    }) as unknown as Promise<void>
    // Trigger second write while the first is in flight
    await expect(
      writeMeta("ferdy", { b: { ext: "jpg", kind: "image", alt: "", caption: "" } })
    ).rejects.toThrow(/locked/i)
    await slow
  })

  it("persists the optional top-level cover when provided", async () => {
    const entry: MediaMetaEntry = { ext: "png", kind: "image", alt: "Hero", caption: "" }
    await writeMeta("ferdy", { hero: entry }, { cover: "hero" })
    const meta = await readMeta("ferdy")
    expect(meta.cover).toBe("hero")
    expect(meta.files.hero).toEqual(entry)
  })

  it("clears the top-level cover when cover is null", async () => {
    await writeMeta(
      "ferdy",
      { hero: { ext: "png", kind: "image", alt: "", caption: "" } },
      { cover: "hero" }
    )
    const before = await readMeta("ferdy")
    expect(before.cover).toBe("hero")
    // Now explicitly clear it (e.g. user un-set the cover)
    await writeMeta("ferdy", {}, { cover: null })
    const after = await readMeta("ferdy")
    expect(after.cover).toBeUndefined()
  })

  it("preserves existing top-level cover when not specified in writeMeta opts", async () => {
    await writeMeta(
      "ferdy",
      { hero: { ext: "png", kind: "image", alt: "", caption: "" } },
      { cover: "hero" }
    )
    // Subsequent write that does NOT pass cover keeps the existing one.
    await writeMeta("ferdy", {
      side: { ext: "jpg", kind: "image", alt: "", caption: "" },
    })
    const meta = await readMeta("ferdy")
    expect(meta.cover).toBe("hero")
    expect(Object.keys(meta.files).sort()).toEqual(["hero", "side"])
  })

  it("readMeta default shape omits cover", async () => {
    const meta = await readMeta("absent-key")
    expect(meta.cover).toBeUndefined()
  })
})
