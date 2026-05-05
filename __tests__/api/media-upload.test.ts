/**
 * @jest-environment node
 */
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { Readable } from "stream"
import { GET as tokenInfo } from "@/app/api/admin/media/token-info/route"
import { POST as upload } from "@/app/api/admin/media/upload/route"
import { POST as commit } from "@/app/api/admin/media/upload/commit/route"
import { signUploadToken } from "@/lib/oauth-jwt"
import { clearMediaMetaCache } from "@/lib/blog/media-meta"
import { clearPostsRuntimeCache } from "@/lib/blog/posts-runtime"

function jsonReq(url: string, init: RequestInit = {}): Request {
  return new Request(url, { ...init })
}

function makeStreamRequest(
  url: string,
  body: Buffer,
  headers: Record<string, string>
): Request {
  // Node's Request supports ReadableStream bodies via the global Request constructor in undici
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(body))
      c.close()
    },
  })
  return new Request(url, { method: "POST", body: stream as any, headers, duplex: "half" } as any)
}

describe("media upload API", () => {
  let tmp: string
  let token: string

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "api-"))
    fs.mkdirSync(path.join(tmp, "content", "posts"), { recursive: true })
    fs.mkdirSync(path.join(tmp, "uploads"), { recursive: true })
    process.env.CONTENT_ROOT = tmp
    process.env.MEDIA_UPLOADS_ROOT = path.join(tmp, "uploads")
    process.env.JWT_SECRET = "test-secret-32-chars-minimum-1234567890"
    fs.writeFileSync(
      path.join(tmp, "content", "posts", "ferdy.mdx"),
      `---
slug: ferdy
title: Caso Ferdy
date: 2026-05-05
locale: es
translationKey: ferdy-2026
---

Body
`
    )
    token = signUploadToken({ translationKey: "ferdy-2026" }, 60)
    clearMediaMetaCache()
    clearPostsRuntimeCache()
  })
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.CONTENT_ROOT
    delete process.env.MEDIA_UPLOADS_ROOT
    delete process.env.JWT_SECRET
  })

  it("rejects upload without token (401)", async () => {
    const res = await upload(makeStreamRequest("http://x/upload", Buffer.from("x"), {
      "content-type": "image/jpeg",
      "x-media-name": "foo",
    }) as any)
    expect(res.status).toBe(401)
  })

  it("rejects upload with disallowed MIME (415)", async () => {
    const res = await upload(makeStreamRequest("http://x/upload", Buffer.from("x"), {
      authorization: `Bearer ${token}`,
      "content-type": "application/x-dosexec",
      "x-media-name": "foo",
    }) as any)
    expect(res.status).toBe(415)
  })

  it("uploads OK and writes the binary", async () => {
    const res = await upload(makeStreamRequest("http://x/upload", Buffer.from("hi"), {
      authorization: `Bearer ${token}`,
      "content-type": "image/jpeg",
      "x-media-name": "fachada",
    }) as any)
    expect(res.status).toBe(200)
    const file = path.join(tmp, "uploads", "ferdy-2026", "fachada.jpg")
    expect(fs.existsSync(file)).toBe(true)
  })

  it("commits _meta.json after a batch", async () => {
    await upload(makeStreamRequest("http://x/upload", Buffer.from("hi"), {
      authorization: `Bearer ${token}`,
      "content-type": "image/jpeg",
      "x-media-name": "fachada",
    }) as any)
    const res = await commit(
      jsonReq("http://x/upload/commit", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          files: [{ name: "fachada", alt: "Fachada", caption: "" }],
        }),
      }) as any
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as { files: Array<{ name: string; url: string }> }
    expect(data.files[0].url).toBe("/uploads/ferdy-2026/fachada.jpg")
    const meta = JSON.parse(
      fs.readFileSync(path.join(tmp, "uploads", "ferdy-2026", "_meta.json"), "utf-8")
    )
    expect(meta.files.fachada.alt).toBe("Fachada")
  })

  it("commit rejects when binary is missing (400)", async () => {
    const res = await commit(
      jsonReq("http://x/upload/commit", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ files: [{ name: "ghost", alt: "", caption: "" }] }),
      }) as any
    )
    expect(res.status).toBe(400)
  })

  it("token-info returns siblings and existing media", async () => {
    await upload(makeStreamRequest("http://x/upload", Buffer.from("hi"), {
      authorization: `Bearer ${token}`,
      "content-type": "image/jpeg",
      "x-media-name": "fachada",
    }) as any)
    await commit(
      jsonReq("http://x/upload/commit", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ files: [{ name: "fachada", alt: "F", caption: "" }] }),
      }) as any
    )
    const res = await tokenInfo({
      nextUrl: { searchParams: new URLSearchParams({ token }) },
    } as any)
    expect(res.status).toBe(200)
    const data = (await res.json()) as { existingMedia: Array<{ name: string }> }
    expect(data.existingMedia.map((m) => m.name)).toEqual(["fachada"])
  })
})
