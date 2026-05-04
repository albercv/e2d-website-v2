/**
 * @jest-environment node
 *
 * Tests para lib/blog/posts-write.ts — lógica pura de escritura de posts MDX
 * (compartida entre los endpoints REST y el handler MCP JSON-RPC).
 */

import * as path from "path"
import * as fs from "fs/promises"
import * as os from "os"

const seedPostMdx = `---
title: Guía n8n
description: Descripcion del seed para testing del runtime reader
date: 2026-01-01
locale: es
slug: guia-n8n
published: true
---

Contenido del post de seed para que el runtime reader lo detecte.
`

let mod: typeof import("../../lib/blog/posts-write")
let runtimeMod: typeof import("../../lib/blog/posts-runtime")
let tmpDir: string
let originalCwd: string

beforeAll(async () => {
  // Sandbox: usamos /tmp como cwd para no tocar el content/ real.
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "posts-write-"))
  await fs.mkdir(path.join(tmpDir, "content", "posts"), { recursive: true })
  // Sembrar un fichero existente para deletePost (con frontmatter válido).
  await fs.writeFile(path.join(tmpDir, "content", "posts", "guia-n8n.mdx"), seedPostMdx)
  originalCwd = process.cwd()
  process.chdir(tmpDir)

  process.env.E2D_MCP_API_KEY = "test-key"
  process.env.ADMIN_REBUILD_URL = "https://example.test/api/admin/rebuild"
  process.env.NEXT_PUBLIC_BASE_URL = "https://evolve2digital.com"
  // CONTENT_ROOT debe apuntar al sandbox; si .env del repo lo define, lo
  // sobreescribimos aquí para no tocar el content/ real durante los tests.
  process.env.CONTENT_ROOT = tmpDir

  jest.resetModules()
  mod = require("../../lib/blog/posts-write")
  runtimeMod = require("../../lib/blog/posts-runtime")
})

beforeEach(() => {
  // El runtime reader cachea por fingerprint de fichero; entre tests que
  // crean/borran ficheros conviene resetear para evitar staleness.
  runtimeMod.clearPostsRuntimeCache()
})

afterAll(async () => {
  process.chdir(originalCwd)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe("lib/blog/posts-write", () => {
  describe("slugify", () => {
    it("normaliza acentos y espacios", () => {
      expect(mod.slugify("Mi Título de Prüeba")).toBe("mi-titulo-de-prueba")
    })

    it("colapsa guiones repetidos", () => {
      expect(mod.slugify("a   b  c")).toBe("a-b-c")
    })
  })

  describe("createPost", () => {
    it("crea un fichero MDX con frontmatter válido", async () => {
      const result = await mod.createPost({
        title: "Test Post Nuevo",
        description: "Este es un post de prueba con descripcion suficiente.",
        content: "# Hola mundo\n\nContenido de prueba con mas de cincuenta caracteres para pasar la validacion.",
        locale: "es",
        tags: ["test"],
      })
      expect(result.slug).toBe("test-post-nuevo")
      expect(result.locale).toBe("es")
      expect(result.url).toBe("https://evolve2digital.com/es/blog/test-post-nuevo")
      const written = await fs.readFile(result.path, "utf-8")
      expect(written).toContain("title: 'Test Post Nuevo'")
      expect(written).toContain("locale: es")
      expect(written).toContain("# Hola mundo")
    })

    it("escapa el frontmatter cuando el título tiene dos puntos", async () => {
      const result = await mod.createPost({
        title: "Caso X: del caos al éxito",
        description: "Una descripción larga sin caracteres problemáticos",
        content: "Contenido suficientemente largo para pasar la validacion " + "x".repeat(50),
        locale: "es",
      })
      const written = await fs.readFile(result.path, "utf-8")
      const matter = require("gray-matter")
      const parsed = matter(written)
      expect(parsed.data.title).toBe("Caso X: del caos al éxito")
    })

    it("rechaza title corto (invalid_params)", async () => {
      await expect(
        mod.createPost({
          title: "ab",
          description: "Descripcion suficientemente larga para pasar.",
          content: "Contenido suficientemente largo para pasar la validacion " + "x".repeat(50),
          locale: "es",
        })
      ).rejects.toMatchObject({ code: "invalid_params", status: 400 })
    })

    it("rechaza locale no soportado", async () => {
      await expect(
        mod.createPost({
          title: "Post Valido",
          description: "Descripcion suficientemente larga.",
          content: "Contenido suficientemente largo para pasar la validacion " + "x".repeat(50),
          locale: "fr" as any,
        })
      ).rejects.toMatchObject({ code: "unsupported_locale", status: 400 })
    })

    it("devuelve conflict (409) si el slug ya existe", async () => {
      await expect(
        mod.createPost({
          title: "Guia n8n",
          description: "Descripcion suficientemente larga.",
          content: "Contenido suficientemente largo para pasar la validacion " + "x".repeat(50),
          locale: "es",
        })
      ).rejects.toMatchObject({ code: "conflict", status: 409 })
    })
  })

  describe("deletePost", () => {
    it("borra el fichero del post existente", async () => {
      const result = await mod.deletePost({ slug: "guia-n8n", locale: "es" })
      expect(result.slug).toBe("guia-n8n")
      // Re-crear el fichero para no romper otros tests.
      await fs.writeFile(path.join(tmpDir, "content", "posts", "guia-n8n.mdx"), seedPostMdx)
    })

    it("devuelve not_found si el slug no existe", async () => {
      await expect(
        mod.deletePost({ slug: "no-existe", locale: "es" })
      ).rejects.toMatchObject({ code: "not_found", status: 404 })
    })

    it("devuelve conflict si el locale no coincide con el del post", async () => {
      await expect(
        mod.deletePost({ slug: "guia-n8n", locale: "en" })
      ).rejects.toMatchObject({ code: "conflict", status: 409 })
    })
  })

  describe("triggerRebuild", () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    it("dispara fetch a ADMIN_REBUILD_URL con bearer y devuelve jobId", async () => {
      const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({ accepted: true, jobId: "1234567890", logPath: "/tmp/build.log" }),
          { status: 202, headers: { "Content-Type": "application/json" } }
        )
      )
      const result = await mod.triggerRebuild()
      expect(fetchMock).toHaveBeenCalledWith(
        "https://example.test/api/admin/rebuild",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-key",
          }),
        })
      )
      expect(result).toMatchObject({ accepted: true, jobId: "1234567890" })
    })

    it("server_misconfigured si falta E2D_MCP_API_KEY", async () => {
      const original = process.env.E2D_MCP_API_KEY
      delete process.env.E2D_MCP_API_KEY
      await expect(mod.triggerRebuild()).rejects.toMatchObject({ code: "server_misconfigured" })
      process.env.E2D_MCP_API_KEY = original
    })

    it("upstream_unreachable si fetch falla", async () => {
      jest.spyOn(global, "fetch").mockRejectedValue(new Error("ECONNREFUSED"))
      await expect(mod.triggerRebuild()).rejects.toMatchObject({ code: "upstream_unreachable" })
    })

    it("upstream_error si fetch devuelve no-ok", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue(
        new Response("nope", { status: 500 })
      )
      await expect(mod.triggerRebuild()).rejects.toMatchObject({ code: "upstream_error" })
    })
  })
})
