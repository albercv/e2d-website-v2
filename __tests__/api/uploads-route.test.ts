/** @jest-environment node */
import { GET } from "@/app/uploads/[...path]/route"
import { mkdtempSync, writeFileSync, symlinkSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

describe("uploads route", () => {
  const root = mkdtempSync(join(tmpdir(), "uploads-"))
  const outside = mkdtempSync(join(tmpdir(), "outside-"))
  const originalRoot = process.env.MEDIA_UPLOADS_ROOT
  let canSymlink = true

  beforeAll(() => {
    process.env.MEDIA_UPLOADS_ROOT = root
    writeFileSync(join(root, "test.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    writeFileSync(join(outside, "secret.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    try {
      symlinkSync(join(outside, "secret.png"), join(root, "escape.png"))
    } catch {
      canSymlink = false
    }
  })

  afterAll(() => {
    if (originalRoot === undefined) {
      delete process.env.MEDIA_UPLOADS_ROOT
    } else {
      process.env.MEDIA_UPLOADS_ROOT = originalRoot
    }
  })

  it("serves an existing file with content-type and long cache", async () => {
    const res = await GET(new Request("http://x/uploads/test.png"), {
      params: { path: ["test.png"] },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("image/png")
    expect(res.headers.get("cache-control")).toContain("immutable")
  })

  it("404s on missing file", async () => {
    const res = await GET(new Request("http://x/uploads/nope.png"), {
      params: { path: ["nope.png"] },
    })
    expect(res.status).toBe(404)
  })

  it("blocks path traversal", async () => {
    const res = await GET(new Request("http://x/uploads/../secret"), {
      params: { path: ["..", "secret"] },
    })
    expect(res.status).toBe(400)
  })

  it("blocks a symlink inside the root that escapes to a file outside it", async () => {
    if (!canSymlink) {
      // Platform can't create symlinks (e.g. restricted CI/sandbox) — skip gracefully.
      return
    }
    const res = await GET(new Request("http://x/uploads/escape.png"), {
      params: { path: ["escape.png"] },
    })
    expect(res.status).toBe(400)
  })
})
