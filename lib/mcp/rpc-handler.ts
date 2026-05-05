/**
 * MCP JSON-RPC handler compartido.
 *
 * Lógica pura del transporte MCP (Streamable HTTP / JSON-RPC 2.0). Sin
 * dependencias de Next/CORS/Auth — esas viven en los route handlers que la
 * envuelven. Permite que `app/mcp/route.ts` y `app/sse/route.ts` compartan
 * la implementación de `initialize`, `tools/list` y `tools/call`.
 */

import { getPost, searchPosts, type BlogLocale } from "@/lib/blog/posts"
import {
  createPost,
  deletePost,
  isPostsWriteError,
  triggerRebuild,
  type Locale,
} from "@/lib/blog/posts-write"

export interface RpcCallContext {
  /**
   * OAuth claims attached to the request, if a Bearer token was present and
   * verified upstream. `null` for callers that don't authenticate (e.g. /mcp
   * without origin allowlist for ChatGPT).
   */
  claims: {
    sub: string
    email: string
    role: string
    scope: string[]
    iss: string
    aud: string
    iat: number
    exp: number
  } | null
}

/**
 * Posts.write tools require a JWT with the matching scope. Returns null on
 * success, or a JSON-RPC error with code -32000 (server-side reserved) on
 * insufficient scope.
 */
function requireScope(
  ctx: RpcCallContext,
  required: string,
  id: JsonRpcId
): JsonRpcError | null {
  const scopes = ctx.claims?.scope ?? []
  if (!scopes.includes(required)) {
    return errorResponse(id, -32000, "insufficient_scope", {
      required,
      provided: scopes,
    })
  }
  return null
}

export type JsonRpcId = string | number | null

export interface JsonRpcRequest {
  jsonrpc: "2.0"
  id?: JsonRpcId
  method: string
  params?: unknown
}

export interface JsonRpcSuccess {
  jsonrpc: "2.0"
  id: JsonRpcId
  result: unknown
}

export interface JsonRpcErrorObject {
  code: number
  message: string
  data?: unknown
}

export interface JsonRpcError {
  jsonrpc: "2.0"
  id: JsonRpcId
  error: JsonRpcErrorObject
}

export const PROTOCOL_VERSION = "2025-03-26"
export const SERVER_INFO = { name: "E2D Blog", version: "1.0.0" }

export function successResponse(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id: id ?? null, result }
}

export function errorResponse(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown
): JsonRpcError {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message, ...(data === undefined ? {} : { data }) },
  }
}

export function asJsonRpcRequest(input: unknown): JsonRpcRequest | null {
  if (!input || typeof input !== "object") return null
  const obj = input as Record<string, unknown>
  if (obj.jsonrpc !== "2.0") return null
  if (typeof obj.method !== "string") return null
  return obj as unknown as JsonRpcRequest
}

export function toolsList() {
  return {
    tools: [
      {
        name: "posts_search",
        description: "Busca posts del blog por consulta textual (solo lectura).",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", minLength: 2 },
            limit: { type: "integer", minimum: 1, maximum: 10, default: 5 },
            locale: { type: "string", enum: ["es", "en", "it"], default: "es" },
          },
          required: ["query"],
        },
      },
      {
        name: "posts_get",
        description: "Obtiene un post del blog por id (slug) (solo lectura).",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", minLength: 1 },
            includeContent: { type: "boolean", default: false },
            locale: { type: "string", enum: ["es", "en", "it"], default: "es" },
          },
          required: ["id"],
        },
      },
      {
        name: "posts_create",
        description:
          "Crea un post nuevo en el blog (requiere scope posts:write). El `content` puede contener " +
          "markers `[image:nombre]`/`[video:nombre]`. `cover` apunta a un nombre de marker " +
          "(imagen) usado como portada. `translationKey` agrupa hermanos i18n; default = slug.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 3 },
            description: { type: "string", minLength: 10 },
            content: { type: "string", minLength: 50, description: "Cuerpo MDX del post." },
            locale: { type: "string", enum: ["es", "en", "it"], default: "es" },
            tags: { type: "array", items: { type: "string" } },
            date: { type: "string", description: "ISO date YYYY-MM-DD; default = hoy." },
            author: { type: "string", default: "Alberto Carrasco" },
            published: { type: "boolean", default: true },
            cover: { type: "string", description: "Nombre de marker (slug-key) usado como portada." },
            translationKey: { type: "string", description: "Agrupa posts hermanos i18n. Default = slug." },
            skip_rebuild: {
              type: "boolean",
              default: false,
              description: "Si true, no dispara rebuild automático tras crear.",
            },
          },
          required: ["title", "description", "content"],
        },
      },
      {
        name: "posts_delete",
        description: "Borra un post del blog por slug (requiere scope posts:delete).",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string", minLength: 1 },
            locale: { type: "string", enum: ["es", "en", "it"] },
            skip_rebuild: { type: "boolean", default: false },
          },
          required: ["slug", "locale"],
        },
      },
      {
        name: "posts_rebuild",
        description:
          "Publica los posts en el sitio público (evolve2digital.com). El MCP ya refleja create/delete inmediatamente sin rebuild; este tool solo es necesario para que un post nuevo aparezca en las páginas HTML del blog. Async, 2-3 min.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "posts_request_upload",
        description:
          "Pide una URL de subida de fotos/vídeos para un post. Devuelve también la lista " +
          "de media ya subida a ese post (mismo translationKey en es/en/it).",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string", minLength: 1 },
            locale: { type: "string", enum: ["es", "en", "it"] },
          },
          required: ["slug", "locale"],
        },
      },
      {
        name: "posts_update_body",
        description:
          "Reescribe el cuerpo MDX de un post existente. El frontmatter se mantiene. " +
          "El `content` puede contener markers `[image:nombre]`/`[video:nombre]`. " +
          "Operación destructiva — revierte con git si hace falta.",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string", minLength: 1 },
            locale: { type: "string", enum: ["es", "en", "it"] },
            content: { type: "string", minLength: 1 },
          },
          required: ["slug", "locale", "content"],
        },
      },
      {
        name: "posts_list_media",
        description:
          "Lista la media (imágenes/vídeos) ya subida a un post. Útil antes de escribir " +
          "markers en el body, para confirmar qué nombres están disponibles.",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string", minLength: 1 },
            locale: { type: "string", enum: ["es", "en", "it"] },
          },
          required: ["slug", "locale"],
        },
      },
      {
        name: "posts_validate",
        description:
          "Comprueba que todos los markers `[image:X]`/`[video:X]` y el `cover` " +
          "del post existan en _meta.json. Sin side effects. Útil antes de `posts_rebuild`.",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string", minLength: 1 },
            locale: { type: "string", enum: ["es", "en", "it"] },
          },
          required: ["slug", "locale"],
        },
      },
    ],
  }
}

function parseLocale(value: unknown): BlogLocale | undefined {
  if (value === "es" || value === "en" || value === "it") return value
  return undefined
}

export async function handleRpcCall(
  req: JsonRpcRequest,
  ctx: RpcCallContext = { claims: null }
): Promise<JsonRpcSuccess | JsonRpcError> {
  const id = req.id ?? null

  if (req.method === "initialize") {
    return successResponse(id, {
      protocolVersion: PROTOCOL_VERSION,
      serverInfo: SERVER_INFO,
      capabilities: { tools: {} },
      instructions:
        "Blog del sitio Evolve2Digital. Soporta media inline vía markers en MDX: " +
        "`[image:nombre]` y `[video:nombre]` en el body, y `cover: nombre` en frontmatter. " +
        "Los nombres son slug-keys (lowercase, ASCII, `_` separador) que apuntan a ficheros " +
        "ya subidos. Para listar lo disponible llama a `posts_list_media`. Para subir nueva " +
        "media llama primero a `posts_request_upload`, que devuelve una URL para que el " +
        "usuario complete la subida vía form. Después usa `posts_create` o `posts_update_body` " +
        "con los markers ya escritos. `posts_validate` hace pre-flight de markers rotos.",
    })
  }

  if (req.method === "tools/list") {
    return successResponse(id, toolsList())
  }

  if (req.method === "tools/call") {
    if (!req.params || typeof req.params !== "object") {
      return errorResponse(id, -32602, "Invalid params")
    }

    const params = req.params as Record<string, unknown>
    const toolName = (params.name ?? params.toolName) as unknown
    const rawArgs = (params.arguments ?? params.args) as unknown

    if (typeof toolName !== "string") {
      return errorResponse(id, -32602, "Invalid params", { field: "name" })
    }

    const args = (rawArgs && typeof rawArgs === "object"
      ? (rawArgs as Record<string, unknown>)
      : {}) as Record<string, unknown>

    if (toolName === "posts_search") {
      const query = typeof args.query === "string" ? args.query : ""
      const limit =
        typeof args.limit === "number"
          ? args.limit
          : typeof args.limit === "string"
            ? Number(args.limit)
            : 5
      const locale = parseLocale(args.locale) ?? "es"

      if (query.trim().length < 2) {
        return errorResponse(id, -32602, "Invalid params", { field: "query" })
      }

      const items = (
        await searchPosts({
          query,
          limit: Number.isFinite(limit) ? limit : 5,
          locale,
          includeSnippet: true,
        })
      ).map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        excerpt: item.contentSnippet || item.excerpt || "",
      }))

      return successResponse(id, {
        content: [{ type: "text", text: JSON.stringify({ items }) }],
      })
    }

    if (toolName === "posts_get") {
      const idValue = typeof args.id === "string" ? args.id : ""
      const includeContent = args.includeContent === true
      const locale = parseLocale(args.locale) ?? "es"

      if (!idValue.trim()) {
        return errorResponse(id, -32602, "Invalid params", { field: "id" })
      }

      const post = await getPost({ id: idValue, includeContent, locale })
      if (!post) {
        return errorResponse(id, -32004, "Not found")
      }

      const output = {
        id: post.id,
        title: post.title,
        url: post.url,
        content: includeContent ? post.content || "" : "",
      }

      return successResponse(id, {
        content: [{ type: "text", text: JSON.stringify(output) }],
      })
    }

    if (toolName === "posts_create") {
      const scopeErr = requireScope(ctx, "posts:write", id)
      if (scopeErr) return scopeErr

      try {
        const result = await createPost({
          title: typeof args.title === "string" ? args.title : "",
          description: typeof args.description === "string" ? args.description : "",
          content: typeof args.content === "string" ? args.content : "",
          locale: (parseLocale(args.locale) ?? "es") as Locale,
          tags: Array.isArray(args.tags)
            ? (args.tags.filter((t) => typeof t === "string") as string[])
            : [],
          date: typeof args.date === "string" ? args.date : undefined,
          author: typeof args.author === "string" ? args.author : undefined,
          published: args.published !== false,
          cover: typeof args.cover === "string" ? args.cover : undefined,
          translationKey: typeof args.translationKey === "string" ? args.translationKey : undefined,
        })

        let rebuild: unknown = null
        const skipRebuild = args.skip_rebuild === true
        if (!skipRebuild && process.env.AUTO_REBUILD_AFTER_MCP_CHANGE === "true") {
          try {
            rebuild = await triggerRebuild()
          } catch (err) {
            rebuild = isPostsWriteError(err)
              ? { error: err.code, message: err.message, details: err.details }
              : { error: "rebuild_failed", message: String(err) }
          }
        }

        return successResponse(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify({ created: true, ...result, rebuild }),
            },
          ],
        })
      } catch (err) {
        if (isPostsWriteError(err)) {
          return errorResponse(id, -32000, err.code, err.details)
        }
        return errorResponse(id, -32603, "Internal error", { message: String(err) })
      }
    }

    if (toolName === "posts_delete") {
      const scopeErr = requireScope(ctx, "posts:delete", id)
      if (scopeErr) return scopeErr

      try {
        const locale = parseLocale(args.locale)
        if (!locale) {
          return errorResponse(id, -32602, "unsupported_locale", { supported: ["es", "en", "it"] })
        }
        const result = await deletePost({
          slug: typeof args.slug === "string" ? args.slug : "",
          locale,
        })

        let rebuild: unknown = null
        const skipRebuild = args.skip_rebuild === true
        if (!skipRebuild && process.env.AUTO_REBUILD_AFTER_MCP_CHANGE === "true") {
          try {
            rebuild = await triggerRebuild()
          } catch (err) {
            rebuild = isPostsWriteError(err)
              ? { error: err.code, message: err.message, details: err.details }
              : { error: "rebuild_failed", message: String(err) }
          }
        }

        return successResponse(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify({ deleted: true, ...result, rebuild }),
            },
          ],
        })
      } catch (err) {
        if (isPostsWriteError(err)) {
          return errorResponse(id, -32000, err.code, err.details)
        }
        return errorResponse(id, -32603, "Internal error", { message: String(err) })
      }
    }

    if (toolName === "posts_request_upload") {
      const scopeErr = requireScope(ctx, "posts:write", id)
      if (scopeErr) return scopeErr
      const slug = typeof args.slug === "string" ? args.slug : ""
      const locale = parseLocale(args.locale)
      if (!slug.trim() || !locale) {
        return errorResponse(id, -32602, "Invalid params")
      }
      const { getTranslationKeyForSlug } = await import("@/lib/blog/translation-key")
      const key = await getTranslationKeyForSlug(slug, locale)
      if (!key) return errorResponse(id, -32004, "Not found")
      const { signUploadToken } = await import("@/lib/oauth-jwt")
      const ttl = 900
      const token = signUploadToken({ translationKey: key }, ttl)
      const base = process.env.NEXT_PUBLIC_BASE_URL || "https://evolve2digital.com"
      const { readMeta } = await import("@/lib/blog/media-meta")
      const meta = await readMeta(key)
      const existingMedia = Object.entries(meta.files).map(([name, e]) => ({
        name,
        kind: e.kind,
        ext: e.ext,
        alt: e.alt,
        caption: e.caption,
        url: `/uploads/${key}/${name}.${e.ext}`,
      }))
      return successResponse(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              uploadUrl: `${base}/admin/media-upload?token=${encodeURIComponent(token)}`,
              expiresAt: Math.floor(Date.now() / 1000) + ttl,
              translationKey: key,
              existingMedia,
            }),
          },
        ],
      })
    }

    if (toolName === "posts_update_body") {
      const scopeErr = requireScope(ctx, "posts:write", id)
      if (scopeErr) return scopeErr
      const slug = typeof args.slug === "string" ? args.slug : ""
      const locale = parseLocale(args.locale)
      const content = typeof args.content === "string" ? args.content : ""
      if (!slug.trim() || !locale || !content) {
        return errorResponse(id, -32602, "Invalid params")
      }
      try {
        const { updatePostBody } = await import("@/lib/blog/posts-write")
        await updatePostBody({ slug, locale, content })
        return successResponse(id, { content: [{ type: "text", text: JSON.stringify({ ok: true }) }] })
      } catch (err) {
        if (isPostsWriteError(err) && err.code === "not_found") {
          return errorResponse(id, -32004, "Not found")
        }
        if (isPostsWriteError(err)) {
          return errorResponse(id, -32000, err.code, err.details)
        }
        return errorResponse(id, -32603, "Internal error", { message: String(err) })
      }
    }

    if (toolName === "posts_list_media") {
      const slug = typeof args.slug === "string" ? args.slug : ""
      const locale = parseLocale(args.locale)
      if (!slug.trim() || !locale) {
        return errorResponse(id, -32602, "Invalid params")
      }
      const { getTranslationKeyForSlug } = await import("@/lib/blog/translation-key")
      const key = await getTranslationKeyForSlug(slug, locale)
      if (!key) return errorResponse(id, -32004, "Not found")
      const { readMeta } = await import("@/lib/blog/media-meta")
      const meta = await readMeta(key)
      const files = Object.entries(meta.files).map(([name, e]) => ({
        name,
        kind: e.kind,
        ext: e.ext,
        alt: e.alt,
        caption: e.caption,
        url: `/uploads/${key}/${name}.${e.ext}`,
      }))
      return successResponse(id, {
        content: [{ type: "text", text: JSON.stringify({ translationKey: key, files }) }],
      })
    }

    if (toolName === "posts_validate") {
      const slug = typeof args.slug === "string" ? args.slug : ""
      const locale = parseLocale(args.locale)
      if (!slug.trim() || !locale) return errorResponse(id, -32602, "Invalid params")
      const { validatePost } = await import("@/lib/blog/posts-validate")
      const result = await validatePost(slug, locale)
      return successResponse(id, { content: [{ type: "text", text: JSON.stringify(result) }] })
    }

    if (toolName === "posts_rebuild") {
      const scopeErr = requireScope(ctx, "posts:write", id)
      if (scopeErr) return scopeErr

      try {
        const result = await triggerRebuild()
        return successResponse(id, {
          content: [{ type: "text", text: JSON.stringify(result) }],
        })
      } catch (err) {
        if (isPostsWriteError(err)) {
          return errorResponse(id, -32000, err.code, err.details)
        }
        return errorResponse(id, -32603, "Internal error", { message: String(err) })
      }
    }

    return errorResponse(id, -32601, "Method not found")
  }

  return errorResponse(id, -32601, "Method not found")
}
