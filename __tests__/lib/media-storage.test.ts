// __tests__/lib/media-storage.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { Readable } from "stream"
import {
  saveMediaFile,
  MediaStorageError,
  ALLOWED_MIME,
  extForMime,
} from "@/lib/blog/media-storage"

describe("media-storage", () => {
  let tmp: string
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ms-"))
    process.env.MEDIA_UPLOADS_ROOT = tmp
  })
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.MEDIA_UPLOADS_ROOT
  })

  it("writes a stream to disk under the translationKey directory", async () => {
    const stream = Readable.from([Buffer.from("hello")])
    const result = await saveMediaFile({
      translationKey: "ferdy",
      name: "fachada",
      mime: "image/jpeg",
      stream,
    })
    expect(result).toEqual({ name: "fachada", ext: "jpg", kind: "image", size: 5 })
    const file = path.join(tmp, "ferdy", "fachada.jpg")
    expect(fs.readFileSync(file, "utf-8")).toBe("hello")
  })

  it("rejects disallowed MIME types", async () => {
    const stream = Readable.from([Buffer.from("x")])
    await expect(
      saveMediaFile({
        translationKey: "ferdy",
        name: "evil",
        mime: "application/x-dosexec",
        stream,
      })
    ).rejects.toBeInstanceOf(MediaStorageError)
  })

  it("rejects when name does not match its slug form", async () => {
    const stream = Readable.from([Buffer.from("x")])
    await expect(
      saveMediaFile({
        translationKey: "ferdy",
        name: "Foo Bar",
        mime: "image/png",
        stream,
      })
    ).rejects.toThrow(/normalized/i)
  })

  it("refuses to overwrite an existing file", async () => {
    fs.mkdirSync(path.join(tmp, "ferdy"), { recursive: true })
    fs.writeFileSync(path.join(tmp, "ferdy", "fachada.jpg"), "old")
    const stream = Readable.from([Buffer.from("new")])
    await expect(
      saveMediaFile({
        translationKey: "ferdy",
        name: "fachada",
        mime: "image/jpeg",
        stream,
      })
    ).rejects.toThrow(/exists/i)
    expect(fs.readFileSync(path.join(tmp, "ferdy", "fachada.jpg"), "utf-8")).toBe("old")
  })

  it("refuses to overwrite when same name has a different extension", async () => {
    fs.mkdirSync(path.join(tmp, "ferdy"), { recursive: true })
    fs.writeFileSync(path.join(tmp, "ferdy", "fachada.jpg"), "old")
    const stream = Readable.from([Buffer.from("new")])
    await expect(
      saveMediaFile({
        translationKey: "ferdy",
        name: "fachada",
        mime: "video/mp4",
        stream,
      })
    ).rejects.toThrow(/exists/i)
  })

  it("exposes the MIME whitelist constants", () => {
    expect(ALLOWED_MIME).toContain("image/jpeg")
    expect(ALLOWED_MIME).toContain("video/mp4")
    expect(extForMime("image/jpeg")).toBe("jpg")
    expect(extForMime("video/quicktime")).toBe("mov")
  })

  it("removes the partial file when the stream errors mid-pipeline", async () => {
    const fail = new Readable({
      read() {
        this.emit("error", new Error("boom"))
      },
    })
    await expect(
      saveMediaFile({
        translationKey: "ferdy",
        name: "broken",
        mime: "image/jpeg",
        stream: fail,
      })
    ).rejects.toBeInstanceOf(MediaStorageError)
    expect(fs.existsSync(path.join(tmp, "ferdy", "broken.jpg"))).toBe(false)
  })
})
