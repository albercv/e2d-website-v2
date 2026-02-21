/**
 * @jest-environment node
 */

import { NextRequest } from "next/server"

const mockAllPosts = [
  {
    title: "Guía de n8n para automatización",
    description: "Aprende a automatizar procesos con n8n.",
    slug: "guia-n8n",
    locale: "es",
    tags: ["n8n", "automation"],
    author: "Test Author",
    date: "2024-01-01",
    published: true,
    body: { raw: "Contenido sobre n8n. n8n permite crear flujos de trabajo." },
    readingTime: 5,
    wordCount: 12,
  },
  {
    title: "WhatsApp automation",
    description: "Bots para WhatsApp",
    slug: "whatsapp-automation",
    locale: "en",
    tags: ["whatsapp"],
    author: "Test Author",
    date: "2024-01-02",
    published: true,
    body: { raw: "WhatsApp automation content." },
    readingTime: 8,
    wordCount: 4,
  },
]

let route: any

beforeAll(() => {
  jest.resetModules()
  jest.doMock("@/.contentlayer/generated", () => ({
    allPosts: mockAllPosts,
  }))
  route = require("../../app/mcp/route")
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

  it("tools/list expone solo posts.search y posts.get", async () => {
    const req = new NextRequest("http://localhost:3000/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    })
    const res = await route.POST(req)
    const json = await res.json()
    const tools = json.result.tools
    expect(tools.map((t: any) => t.name).sort()).toEqual(["posts.get", "posts.search"])
  })

  it("tools/call posts.search devuelve items", async () => {
    const req = new NextRequest("http://localhost:3000/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "posts.search", arguments: { query: "n8n", limit: 5 } },
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

  it("tools/call posts.get respeta includeContent=false", async () => {
    const req = new NextRequest("http://localhost:3000/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "posts.get", arguments: { id: "guia-n8n", includeContent: false } },
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
