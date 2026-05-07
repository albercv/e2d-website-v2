/**
 * @jest-environment node
 */

import { NextRequest } from "next/server"
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

let route: any
let runtimeMod: typeof import("../../lib/blog/posts-runtime")
let tmpDir: string

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-streamable-"))
  await fs.mkdir(path.join(tmpDir, "content", "posts"), { recursive: true })
  await fs.writeFile(path.join(tmpDir, "content", "posts", "guia-n8n.mdx"), seedEs)
  await fs.writeFile(path.join(tmpDir, "content", "posts", "whatsapp-automation.mdx"), seedEn)
  process.env.CONTENT_ROOT = tmpDir

  jest.resetModules()
  route = require("../../app/mcp/route")
  runtimeMod = require("../../lib/blog/posts-runtime")
})

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

beforeEach(() => {
  runtimeMod.clearPostsRuntimeCache()
})

describe("/mcp (Streamable HTTP JSON-RPC)", () => {
  it("GET /mcp responde 200", async () => {
    const req = new NextRequest("http://localhost:3000/mcp", { method: "GET" })
    const res = await route.GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty("transport", "streamable-http")
    expect(json).toHaveProperty("methods")
  })

  it("bloquea Origin no permitido cuando viene informado", async () => {
    const req = new NextRequest("http://localhost:3000/mcp", {
      method: "GET",
      headers: { origin: "https://evil.example" },
    })
    const res = await route.GET(req)
    expect(res.status).toBe(403)
  })

  it("POST initialize devuelve serverInfo y protocolVersion", async () => {
    const req = new NextRequest("http://localhost:3000/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    })
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

  it("tools/list expone los tools del handler", async () => {
    const req = new NextRequest("http://localhost:3000/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    })
    const res = await route.POST(req)
    const json = await res.json()
    const tools = json.result.tools
    expect(tools.map((t: any) => t.name).sort()).toEqual([
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

  it("tools/call posts_create sin claims devuelve insufficient_scope", async () => {
    const req = new NextRequest("http://localhost:3000/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 99,
        method: "tools/call",
        params: { name: "posts_create", arguments: { title: "x", description: "y", content: "z" } },
      }),
    })
    const res = await route.POST(req)
    const json = await res.json()
    expect(json.error).toMatchObject({ code: -32000, message: "insufficient_scope" })
  })

  it("tools/call posts_search devuelve items", async () => {
    const req = new NextRequest("http://localhost:3000/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "posts_search", arguments: { query: "n8n", limit: 5 } },
      }),
    })
    const res = await route.POST(req)
    const json = await res.json()
    const text = json.result.content[0].text
    const parsed = JSON.parse(text)
    expect(parsed.items.length).toBeGreaterThan(0)
    expect(parsed.items[0]).toHaveProperty("id")
    expect(parsed.items[0]).toHaveProperty("title")
    expect(parsed.items[0]).toHaveProperty("url")
    expect(parsed.items[0]).toHaveProperty("excerpt")
  })

  it("tools/call posts_get respeta includeContent=false", async () => {
    const req = new NextRequest("http://localhost:3000/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "posts_get", arguments: { id: "guia-n8n", includeContent: false } },
      }),
    })
    const res = await route.POST(req)
    const json = await res.json()
    const text = json.result.content[0].text
    const parsed = JSON.parse(text)
    expect(parsed).toMatchObject({
      id: "guia-n8n",
      title: expect.any(String),
      url: expect.any(String),
      content: "",
    })
  })
})
