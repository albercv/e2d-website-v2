import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { setCover, SetCoverError } from "@/lib/blog/media-cover"
import { writeMeta, readMeta, clearMediaMetaCache } from "@/lib/blog/media-meta"

describe("setCover", () => {
  let root: string
  const previousRoot = process.env.MEDIA_UPLOADS_ROOT

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "set-cover-"))
    process.env.MEDIA_UPLOADS_ROOT = root
    clearMediaMetaCache()
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
    if (previousRoot === undefined) delete process.env.MEDIA_UPLOADS_ROOT
    else process.env.MEDIA_UPLOADS_ROOT = previousRoot
    clearMediaMetaCache()
  })

  it("sets meta.cover when the named entry exists and is an image", async () => {
    await writeMeta("k1", { hero: { ext: "jpg", kind: "image", alt: "", caption: "" } })
    await setCover("k1", "hero")
    const meta = await readMeta("k1")
    expect(meta.cover).toBe("hero")
  })

  it("overwrites a previous cover", async () => {
    await writeMeta("k1", {
      hero: { ext: "jpg", kind: "image", alt: "", caption: "" },
      cover2: { ext: "jpg", kind: "image", alt: "", caption: "" },
    }, { cover: "hero" })
    await setCover("k1", "cover2")
    const meta = await readMeta("k1")
    expect(meta.cover).toBe("cover2")
  })

  it("clears meta.cover when name is null", async () => {
    await writeMeta("k1", { hero: { ext: "jpg", kind: "image", alt: "", caption: "" } }, { cover: "hero" })
    await setCover("k1", null)
    const meta = await readMeta("k1")
    expect(meta.cover).toBeUndefined()
  })

  it("throws not_found when the entry does not exist", async () => {
    await writeMeta("k1", { hero: { ext: "jpg", kind: "image", alt: "", caption: "" } })
    await expect(setCover("k1", "missing")).rejects.toBeInstanceOf(SetCoverError)
    await expect(setCover("k1", "missing")).rejects.toMatchObject({ code: "not_found" })
  })

  it("throws kind_mismatch when the entry is a video", async () => {
    await writeMeta("k1", { reel: { ext: "mp4", kind: "video", alt: "", caption: "" } })
    await expect(setCover("k1", "reel")).rejects.toMatchObject({ code: "kind_mismatch" })
  })

  it("preserves existing files when only updating cover", async () => {
    await writeMeta("k1", {
      hero: { ext: "jpg", kind: "image", alt: "Hero alt", caption: "Hero caption" },
      reel: { ext: "mp4", kind: "video", alt: "", caption: "" },
    })
    await setCover("k1", "hero")
    const meta = await readMeta("k1")
    expect(Object.keys(meta.files).sort()).toEqual(["hero", "reel"])
    expect(meta.files.hero.alt).toBe("Hero alt")
  })
})
