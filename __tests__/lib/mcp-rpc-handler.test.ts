/**
 * @jest-environment node
 *
 * Tests para el handler JSON-RPC compartido (lib/mcp/rpc-handler.ts).
 * Este módulo es la lógica pura que /mcp y /sse comparten.
 */

import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"

const seedEs = `---
title: Guía de n8n para automatización
description: Aprende a automatizar procesos con n8n.
date: 2024-01-01
locale: es
slug: guia-n8n
tags: ['n8n', 'automation']
author: Test Author
published: true
---

Contenido sobre n8n. n8n permite crear flujos de trabajo.
`

const seedEn = `---
title: WhatsApp automation
description: Bots para WhatsApp
date: 2024-01-02
locale: en
slug: whatsapp-automation
tags: ['whatsapp']
author: Test Author
published: true
---

WhatsApp automation content.
`

let mod: typeof import("../../lib/mcp/rpc-handler")
let runtimeMod: typeof import("../../lib/blog/posts-runtime")
let tmpDir: string

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "rpc-handler-"))
  await fs.mkdir(path.join(tmpDir, "content", "posts"), { recursive: true })
  await fs.writeFile(path.join(tmpDir, "content", "posts", "guia-n8n.mdx"), seedEs)
  await fs.writeFile(path.join(tmpDir, "content", "posts", "whatsapp-automation.mdx"), seedEn)
  process.env.CONTENT_ROOT = tmpDir

  jest.resetModules()
  mod = require("../../lib/mcp/rpc-handler")
  runtimeMod = require("../../lib/blog/posts-runtime")
})

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

beforeEach(() => {
  runtimeMod.clearPostsRuntimeCache()
})

describe("lib/mcp/rpc-handler", () => {
  describe("asJsonRpcRequest", () => {
    it("acepta un objeto JSON-RPC 2.0 válido", () => {
      const result = mod.asJsonRpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" })
      expect(result).toMatchObject({ jsonrpc: "2.0", id: 1, method: "tools/list" })
    })

    it("rechaza si falta method", () => {
      expect(mod.asJsonRpcRequest({ jsonrpc: "2.0", id: 1 })).toBeNull()
    })

    it("rechaza si jsonrpc no es 2.0", () => {
      expect(mod.asJsonRpcRequest({ jsonrpc: "1.0", method: "x" })).toBeNull()
    })

    it("rechaza valores no-objeto", () => {
      expect(mod.asJsonRpcRequest(null)).toBeNull()
      expect(mod.asJsonRpcRequest("hello")).toBeNull()
      expect(mod.asJsonRpcRequest(42)).toBeNull()
    })
  })

  describe("handleRpcCall - initialize", () => {
    it("devuelve serverInfo + protocolVersion + capabilities.tools", async () => {
      const res = await mod.handleRpcCall({ jsonrpc: "2.0", id: 1, method: "initialize" })
      expect(res).toMatchObject({
        jsonrpc: "2.0",
        id: 1,
        result: {
          serverInfo: { name: expect.any(String), version: expect.any(String) },
          protocolVersion: expect.any(String),
          capabilities: { tools: {} },
        },
      })
    })
  })

  describe("handleRpcCall - tools/list", () => {
    it("devuelve los tools (read + write + rebuild + request_upload + update_body + list_media + validate)", async () => {
      const res = await mod.handleRpcCall({ jsonrpc: "2.0", id: 2, method: "tools/list" })
      const result = (res as any).result
      expect(result.tools.map((t: any) => t.name).sort()).toEqual([
        "posts_create",
        "posts_delete",
        "posts_get",
        "posts_list_media",
        "posts_rebuild",
        "posts_request_upload",
        "posts_search",
        "posts_update_body",
        "posts_validate",
      ])
    })
  })

  describe("handleRpcCall - tools/call posts_search", () => {
    it("devuelve items con id/title/url/excerpt", async () => {
      const res = await mod.handleRpcCall({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "posts_search", arguments: { query: "n8n", limit: 5 } },
      })
      const text = (res as any).result.content[0].text
      const parsed = JSON.parse(text)
      expect(parsed.items.length).toBeGreaterThan(0)
      expect(parsed.items[0]).toHaveProperty("id")
      expect(parsed.items[0]).toHaveProperty("title")
      expect(parsed.items[0]).toHaveProperty("url")
      expect(parsed.items[0]).toHaveProperty("excerpt")
    })

    it("devuelve -32602 si query es demasiado corta", async () => {
      const res = await mod.handleRpcCall({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "posts_search", arguments: { query: "x" } },
      })
      expect((res as any).error).toMatchObject({ code: -32602 })
    })
  })

  describe("handleRpcCall - tools/call posts_get", () => {
    it("respeta includeContent=false", async () => {
      const res = await mod.handleRpcCall({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "posts_get", arguments: { id: "guia-n8n", includeContent: false } },
      })
      const text = (res as any).result.content[0].text
      const parsed = JSON.parse(text)
      expect(parsed).toMatchObject({
        id: "guia-n8n",
        title: expect.any(String),
        url: expect.any(String),
        content: "",
      })
    })

    it("devuelve -32004 (Not found) si el slug no existe", async () => {
      const res = await mod.handleRpcCall({
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: { name: "posts_get", arguments: { id: "no-existe-jamas" } },
      })
      expect((res as any).error).toMatchObject({ code: -32004 })
    })
  })

  describe("handleRpcCall - posts_create (scope posts:write)", () => {
    afterEach(() => jest.restoreAllMocks())

    it("sin claims → -32000 insufficient_scope", async () => {
      const res = await mod.handleRpcCall({
        jsonrpc: "2.0",
        id: 100,
        method: "tools/call",
        params: { name: "posts_create", arguments: { title: "x", description: "y", content: "z" } },
      })
      expect((res as any).error).toMatchObject({
        code: -32000,
        message: "insufficient_scope",
        data: expect.objectContaining({ required: "posts:write" }),
      })
    })

    it("con scope incorrecto → insufficient_scope", async () => {
      const res = await mod.handleRpcCall(
        {
          jsonrpc: "2.0",
          id: 101,
          method: "tools/call",
          params: { name: "posts_create", arguments: { title: "x", description: "y", content: "z" } },
        },
        { claims: { sub: "u", email: "e", role: "admin", scope: ["posts:read"], iss: "x", aud: "x", iat: 0, exp: 0 } }
      )
      expect((res as any).error).toMatchObject({ code: -32000, message: "insufficient_scope" })
    })

    it("title corto → -32000 invalid_params", async () => {
      const res = await mod.handleRpcCall(
        {
          jsonrpc: "2.0",
          id: 102,
          method: "tools/call",
          params: { name: "posts_create", arguments: { title: "ab", description: "y", content: "z" } },
        },
        { claims: { sub: "u", email: "e", role: "admin", scope: ["posts:write"], iss: "x", aud: "x", iat: 0, exp: 0 } }
      )
      expect((res as any).error).toMatchObject({ code: -32000, message: "invalid_params" })
    })
  })

  describe("handleRpcCall - posts_delete (scope posts:delete)", () => {
    it("sin claims → insufficient_scope", async () => {
      const res = await mod.handleRpcCall({
        jsonrpc: "2.0",
        id: 200,
        method: "tools/call",
        params: { name: "posts_delete", arguments: { slug: "x", locale: "es" } },
      })
      expect((res as any).error).toMatchObject({
        code: -32000,
        data: expect.objectContaining({ required: "posts:delete" }),
      })
    })

    it("not_found si no existe", async () => {
      const res = await mod.handleRpcCall(
        {
          jsonrpc: "2.0",
          id: 201,
          method: "tools/call",
          params: { name: "posts_delete", arguments: { slug: "no-existe-2026", locale: "es" } },
        },
        { claims: { sub: "u", email: "e", role: "admin", scope: ["posts:delete"], iss: "x", aud: "x", iat: 0, exp: 0 } }
      )
      expect((res as any).error).toMatchObject({ code: -32000, message: "not_found" })
    })
  })

  describe("handleRpcCall - posts_rebuild (scope posts:write)", () => {
    afterEach(() => jest.restoreAllMocks())

    it("sin claims → insufficient_scope", async () => {
      const res = await mod.handleRpcCall({
        jsonrpc: "2.0",
        id: 300,
        method: "tools/call",
        params: { name: "posts_rebuild", arguments: {} },
      })
      expect((res as any).error).toMatchObject({
        code: -32000,
        data: expect.objectContaining({ required: "posts:write" }),
      })
    })

    it("con scope correcto → devuelve jobId", async () => {
      process.env.E2D_MCP_API_KEY = "test-key"
      process.env.ADMIN_REBUILD_URL = "https://example.test/api/admin/rebuild"
      jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({ accepted: true, jobId: "job-xyz", logPath: "/tmp/build.log" }),
          { status: 202, headers: { "Content-Type": "application/json" } }
        )
      )
      const res = await mod.handleRpcCall(
        {
          jsonrpc: "2.0",
          id: 301,
          method: "tools/call",
          params: { name: "posts_rebuild", arguments: {} },
        },
        { claims: { sub: "u", email: "e", role: "admin", scope: ["posts:write"], iss: "x", aud: "x", iat: 0, exp: 0 } }
      )
      const text = (res as any).result.content[0].text
      const parsed = JSON.parse(text)
      expect(parsed).toMatchObject({ accepted: true, jobId: "job-xyz" })
    })
  })

  describe("handleRpcCall - métodos desconocidos", () => {
    it("devuelve -32601 Method not found", async () => {
      const res = await mod.handleRpcCall({ jsonrpc: "2.0", id: 7, method: "what/is/this" })
      expect((res as any).error).toMatchObject({ code: -32601 })
    })

    it("tools/call con tool desconocido devuelve -32601", async () => {
      const res = await mod.handleRpcCall({
        jsonrpc: "2.0",
        id: 8,
        method: "tools/call",
        params: { name: "no.existe", arguments: {} },
      })
      expect((res as any).error).toMatchObject({ code: -32601 })
    })
  })

  describe("rpc-handler — initialize.instructions", () => {
    it("includes instructions describing the marker convention", async () => {
      const res = (await mod.handleRpcCall({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
      })) as any
      expect(res.result.instructions).toMatch(/\[image:/)
      expect(res.result.instructions).toMatch(/\[video:/)
      expect(res.result.instructions).toMatch(/cover/)
    })
  })

  describe("rpc-handler — posts_request_upload", () => {
    let uploadTmp: string
    const fsSync = require("fs") as typeof import("fs")
    const previousContentRoot = process.env.CONTENT_ROOT
    const previousMediaRoot = process.env.MEDIA_UPLOADS_ROOT
    const previousJwtSecret = process.env.JWT_SECRET

    beforeEach(() => {
      uploadTmp = fsSync.mkdtempSync(path.join(os.tmpdir(), "rpc-upload-"))
      fsSync.mkdirSync(path.join(uploadTmp, "content", "posts"), { recursive: true })
      fsSync.mkdirSync(path.join(uploadTmp, "uploads"), { recursive: true })
      process.env.CONTENT_ROOT = uploadTmp
      process.env.MEDIA_UPLOADS_ROOT = path.join(uploadTmp, "uploads")
      process.env.JWT_SECRET = "test-secret-32-chars-minimum-1234567890"
      fsSync.writeFileSync(
        path.join(uploadTmp, "content", "posts", "ferdy.mdx"),
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
      runtimeMod.clearPostsRuntimeCache()
      const mediaMeta = require("../../lib/blog/media-meta") as typeof import("../../lib/blog/media-meta")
      mediaMeta.clearMediaMetaCache()
    })

    afterEach(() => {
      fsSync.rmSync(uploadTmp, { recursive: true, force: true })
      if (previousContentRoot === undefined) delete process.env.CONTENT_ROOT
      else process.env.CONTENT_ROOT = previousContentRoot
      if (previousMediaRoot === undefined) delete process.env.MEDIA_UPLOADS_ROOT
      else process.env.MEDIA_UPLOADS_ROOT = previousMediaRoot
      if (previousJwtSecret === undefined) delete process.env.JWT_SECRET
      else process.env.JWT_SECRET = previousJwtSecret
      runtimeMod.clearPostsRuntimeCache()
    })

    it("returns 401-equivalent error without posts:write scope", async () => {
      const res = (await mod.handleRpcCall(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "posts_request_upload",
            arguments: { slug: "ferdy", locale: "es" },
          },
        },
        { claims: null }
      )) as any
      expect(res.error).toBeDefined()
    })

    it("returns uploadUrl + translationKey for an existing post (with scope)", async () => {
      const res = (await mod.handleRpcCall(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "posts_request_upload",
            arguments: { slug: "ferdy", locale: "es" },
          },
        },
        { claims: { sub: "u", scope: "posts:write" } as any }
      )) as any
      const text = JSON.parse(res.result.content[0].text)
      expect(text.uploadUrl).toMatch(/\/admin\/media-upload\?token=/)
      expect(text.translationKey).toBe("ferdy-2026")
      expect(Array.isArray(text.existingMedia)).toBe(true)
      // cover defaults to null when no _meta.json or no top-level cover present
      expect(text.cover).toBeNull()
    })

    it("includes the current cover when meta.cover is set", async () => {
      const keyDir = path.join(uploadTmp, "uploads", "ferdy-2026")
      fsSync.mkdirSync(keyDir, { recursive: true })
      fsSync.writeFileSync(
        path.join(keyDir, "_meta.json"),
        JSON.stringify({
          version: 1,
          cover: "hero",
          files: { hero: { ext: "png", kind: "image", alt: "", caption: "" } },
        })
      )
      const mediaMeta = require("../../lib/blog/media-meta") as typeof import("../../lib/blog/media-meta")
      mediaMeta.clearMediaMetaCache()
      const res = (await mod.handleRpcCall(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "posts_request_upload",
            arguments: { slug: "ferdy", locale: "es" },
          },
        },
        { claims: { sub: "u", scope: "posts:write" } as any }
      )) as any
      const text = JSON.parse(res.result.content[0].text)
      expect(text.cover).toBe("hero")
    })

    it("returns not-found error for a missing slug", async () => {
      const res = (await mod.handleRpcCall(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "posts_request_upload",
            arguments: { slug: "ghost", locale: "es" },
          },
        },
        { claims: { sub: "u", scope: "posts:write" } as any }
      )) as any
      expect(res.error).toBeDefined()
    })
  })

  describe("rpc-handler — posts_list_media", () => {
    let listTmp: string
    const fsSync = require("fs") as typeof import("fs")
    const previousContentRoot = process.env.CONTENT_ROOT
    const previousMediaRoot = process.env.MEDIA_UPLOADS_ROOT
    const previousJwtSecret = process.env.JWT_SECRET

    beforeEach(() => {
      listTmp = fsSync.mkdtempSync(path.join(os.tmpdir(), "rpc-list-media-"))
      fsSync.mkdirSync(path.join(listTmp, "content", "posts"), { recursive: true })
      fsSync.mkdirSync(path.join(listTmp, "uploads"), { recursive: true })
      process.env.CONTENT_ROOT = listTmp
      process.env.MEDIA_UPLOADS_ROOT = path.join(listTmp, "uploads")
      process.env.JWT_SECRET = "test-secret-32-chars-minimum-1234567890"
      fsSync.writeFileSync(
        path.join(listTmp, "content", "posts", "ferdy.mdx"),
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
      runtimeMod.clearPostsRuntimeCache()
      const mediaMeta = require("../../lib/blog/media-meta") as typeof import("../../lib/blog/media-meta")
      mediaMeta.clearMediaMetaCache()
    })

    afterEach(() => {
      fsSync.rmSync(listTmp, { recursive: true, force: true })
      if (previousContentRoot === undefined) delete process.env.CONTENT_ROOT
      else process.env.CONTENT_ROOT = previousContentRoot
      if (previousMediaRoot === undefined) delete process.env.MEDIA_UPLOADS_ROOT
      else process.env.MEDIA_UPLOADS_ROOT = previousMediaRoot
      if (previousJwtSecret === undefined) delete process.env.JWT_SECRET
      else process.env.JWT_SECRET = previousJwtSecret
      runtimeMod.clearPostsRuntimeCache()
    })

    it("returns empty list when _meta.json is absent", async () => {
      const res = (await mod.handleRpcCall(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "posts_list_media", arguments: { slug: "ferdy", locale: "es" } },
        },
        { claims: { sub: "u", scope: "posts:read" } as any }
      )) as any
      const text = JSON.parse(res.result.content[0].text)
      expect(text.files).toEqual([])
      expect(text.cover).toBeNull()
    })

    it("surfaces meta.cover (top-level) when set", async () => {
      const keyDir = path.join(listTmp, "uploads", "ferdy-2026")
      fsSync.mkdirSync(keyDir, { recursive: true })
      fsSync.writeFileSync(
        path.join(keyDir, "_meta.json"),
        JSON.stringify({
          version: 1,
          cover: "hero",
          files: { hero: { ext: "jpg", kind: "image", alt: "Hero", caption: "" } },
        })
      )
      const mediaMeta = require("../../lib/blog/media-meta") as typeof import("../../lib/blog/media-meta")
      mediaMeta.clearMediaMetaCache()
      const res = (await mod.handleRpcCall(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "posts_list_media", arguments: { slug: "ferdy", locale: "es" } },
        },
        { claims: { sub: "u", scope: "posts:read" } as any }
      )) as any
      const text = JSON.parse(res.result.content[0].text)
      expect(text.cover).toBe("hero")
      expect(text.files.length).toBe(1)
    })

    it("returns the existing media list", async () => {
      // Write a _meta.json with one file for translationKey ferdy-2026.
      const keyDir = path.join(listTmp, "uploads", "ferdy-2026")
      fsSync.mkdirSync(keyDir, { recursive: true })
      fsSync.writeFileSync(
        path.join(keyDir, "_meta.json"),
        JSON.stringify({
          version: 1,
          files: {
            hero: { ext: "jpg", kind: "image", alt: "Hero shot", caption: "" },
          },
        })
      )
      const res = (await mod.handleRpcCall(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "posts_list_media", arguments: { slug: "ferdy", locale: "es" } },
        },
        { claims: { sub: "u", scope: "posts:read" } as any }
      )) as any
      const text = JSON.parse(res.result.content[0].text)
      expect(text.files.length).toBeGreaterThan(0)
    })
  })
})
