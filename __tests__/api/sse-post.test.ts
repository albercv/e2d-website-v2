/**
 * @jest-environment node
 *
 * Tests para POST /sse — el transporte MCP "Streamable HTTP" usado por Claude.ai.
 * Antes del fix devolvía 405 Method Not Allowed porque /sse solo soportaba GET.
 */

import { NextRequest } from "next/server"
import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"

const seedMdx = `---
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

let route: any
let signAccessToken: (payload: any, ttl?: number) => string
let runtimeMod: typeof import("../../lib/blog/posts-runtime")
let tmpDir: string

beforeAll(async () => {
  // JWT_SECRET tiene que estar en el entorno antes de importar oauth-jwt y la ruta.
  process.env.JWT_SECRET = "test-secret-must-be-at-least-32-bytes-long-for-jwt"
  process.env.NEXT_PUBLIC_BASE_URL = "https://evolve2digital.com"

  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sse-post-"))
  await fs.mkdir(path.join(tmpDir, "content", "posts"), { recursive: true })
  await fs.writeFile(path.join(tmpDir, "content", "posts", "guia-n8n.mdx"), seedMdx)
  process.env.CONTENT_ROOT = tmpDir

  jest.resetModules()
  route = require("../../app/sse/route")
  signAccessToken = require("../../lib/oauth-jwt").signAccessToken
  runtimeMod = require("../../lib/blog/posts-runtime")
})

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

beforeEach(() => {
  runtimeMod.clearPostsRuntimeCache()
})

function makeBearer(scopes: string[] = ["posts:read", "search:read"]): string {
  return signAccessToken({
    sub: "user-1",
    email: "alberto.carrasco@evolve2digital.com",
    role: "admin",
    scope: scopes,
    aud: "https://evolve2digital.com",
  })
}

function rpcRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/sse", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

describe("POST /sse (MCP Streamable HTTP transport)", () => {
  describe("autenticación bearer", () => {
    it("responde 401 con WWW-Authenticate cuando falta el bearer", async () => {
      const req = rpcRequest({ jsonrpc: "2.0", id: 1, method: "initialize" })
      const res = await route.POST(req)
      expect(res.status).toBe(401)
      const wwwAuth = res.headers.get("www-authenticate")
      expect(wwwAuth).toMatch(/Bearer/)
    })

    it("responde 401 cuando el bearer es inválido (firma corrupta)", async () => {
      const req = rpcRequest(
        { jsonrpc: "2.0", id: 1, method: "initialize" },
        { Authorization: "Bearer not.a.valid.jwt" }
      )
      const res = await route.POST(req)
      expect(res.status).toBe(401)
    })
  })

  describe("JSON-RPC con bearer válido", () => {
    it("initialize devuelve serverInfo + protocolVersion", async () => {
      const req = rpcRequest(
        { jsonrpc: "2.0", id: 1, method: "initialize" },
        { Authorization: `Bearer ${makeBearer()}` }
      )
      const res = await route.POST(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toMatchObject({
        jsonrpc: "2.0",
        id: 1,
        result: {
          serverInfo: { name: expect.any(String), version: expect.any(String) },
          protocolVersion: expect.any(String),
        },
      })
    })

    it("tools/list expone los 5 tools", async () => {
      const req = rpcRequest(
        { jsonrpc: "2.0", id: 2, method: "tools/list" },
        { Authorization: `Bearer ${makeBearer()}` }
      )
      const res = await route.POST(req)
      const json = await res.json()
      expect(json.result.tools.map((t: any) => t.name).sort()).toEqual([
        "posts_create",
        "posts_delete",
        "posts_get",
        "posts_rebuild",
        "posts_search",
      ])
    })

    it("posts_create con scope correcto crea el post (mock fs)", async () => {
      const fs = require("fs/promises")
      const writeSpy = jest.spyOn(fs, "writeFile").mockResolvedValue(undefined as any)
      const mkdirSpy = jest.spyOn(fs, "mkdir").mockResolvedValue(undefined as any)
      const req = rpcRequest(
        {
          jsonrpc: "2.0",
          id: 50,
          method: "tools/call",
          params: {
            name: "posts_create",
            arguments: {
              title: "Smoke Post de prueba",
              description: "Post de smoke test desde Jest con descripcion suficiente.",
              content: "Contenido suficientemente largo para pasar la validacion " + "x".repeat(50),
              locale: "es",
              skip_rebuild: true,
            },
          },
        },
        { Authorization: `Bearer ${makeBearer(["posts:write"])}` }
      )
      const res = await route.POST(req)
      const json = await res.json()
      const parsed = JSON.parse(json.result.content[0].text)
      expect(parsed).toMatchObject({ created: true, slug: "smoke-post-de-prueba", locale: "es" })
      writeSpy.mockRestore()
      mkdirSpy.mockRestore()
    })

    it("posts_create sin scope correcto devuelve insufficient_scope", async () => {
      const req = rpcRequest(
        {
          jsonrpc: "2.0",
          id: 51,
          method: "tools/call",
          params: {
            name: "posts_create",
            arguments: { title: "x", description: "y", content: "z" },
          },
        },
        { Authorization: `Bearer ${makeBearer(["posts:read"])}` }
      )
      const res = await route.POST(req)
      const json = await res.json()
      expect(json.error).toMatchObject({ code: -32000, message: "insufficient_scope" })
    })

    it("tools/call posts_search devuelve items", async () => {
      const req = rpcRequest(
        {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "posts_search", arguments: { query: "n8n", limit: 5 } },
        },
        { Authorization: `Bearer ${makeBearer()}` }
      )
      const res = await route.POST(req)
      const json = await res.json()
      const parsed = JSON.parse(json.result.content[0].text)
      expect(parsed.items.length).toBeGreaterThan(0)
    })
  })

  describe("JSON-RPC mal formado", () => {
    it("body no-JSON devuelve -32700 Parse error", async () => {
      const req = new NextRequest("http://localhost:3000/sse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${makeBearer()}`,
        },
        body: "not-json",
      })
      const res = await route.POST(req)
      const json = await res.json()
      expect(json.error).toMatchObject({ code: -32700 })
    })

    it("body sin method devuelve -32600 Invalid Request", async () => {
      const req = rpcRequest(
        { jsonrpc: "2.0", id: 9 },
        { Authorization: `Bearer ${makeBearer()}` }
      )
      const res = await route.POST(req)
      const json = await res.json()
      expect(json.error).toMatchObject({ code: -32600 })
    })
  })

  describe("CORS / OPTIONS", () => {
    it("OPTIONS responde con headers CORS abiertos", async () => {
      const req = new NextRequest("http://localhost:3000/sse", { method: "OPTIONS" })
      const res = await route.OPTIONS(req)
      expect(res.status).toBe(200)
      expect(res.headers.get("access-control-allow-origin")).toBe("*")
    })
  })
})
