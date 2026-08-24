/** @jest-environment node */
import { GET } from "@/app/uploads/[...path]/route"
import { mkdtempSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

describe("uploads route", () => {
  const root = mkdtempSync(join(tmpdir(), "uploads-"))
  const originalRoot = process.env.MEDIA_UPLOADS_ROOT

  beforeAll(() => {
    process.env.MEDIA_UPLOADS_ROOT = root
    writeFileSync(join(root, "test.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
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
})
