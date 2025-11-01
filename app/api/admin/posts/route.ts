import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import { z } from "zod"

const CONTENT_DIR = path.join(process.cwd(), "content")

function sanitizeRelativeFile(rel: string) {
  if (!rel || rel.startsWith("/") || rel.includes("..")) throw new Error("Ruta inválida")
  return rel
}

function normalizeSlug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9-\s]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const FrontmatterSchema = z.object({
  title: z.string().min(1, "title requerido"),
  description: z.string().min(1, "description requerida"),
  date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "date inválida, ISO recomendado (YYYY-MM-DD)"),
  locale: z.enum(["es", "en", "it"], { description: "locale debe ser es|en|it" }),
  slug: z
    .string()
    .min(1, "slug requerido")
    .transform((v) => normalizeSlug(v))
    .refine((v) => /^[a-z0-9-]+$/.test(v), "slug inválido (solo a-z, 0-9 y '-')"),
  cover: z.string().min(1).optional(), // puede ser URL o ruta relativa pública
  tags: z.array(z.string()).optional(),
  author: z.string().min(1).optional(),
  published: z.boolean().optional().default(true),
})

type FM = z.infer<typeof FrontmatterSchema>

function filePathFromFM(fm: FM) {
  return `${fm.slug}.${fm.locale}.mdx`
}

async function exists(p: string) {
  try {
    const st = await fs.stat(p)
    return st.isFile()
  } catch {
    return false
  }
}

function errorResponse(message: string, status = 400, info?: unknown) {
  return NextResponse.json({ ok: false, error: message, info }, { status })
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body.mdx !== "string") {
      return errorResponse("mdx es obligatorio", 400)
    }
    const { mdx, overwrite, slug, locale } = body as {
      mdx: string
      overwrite?: boolean
      slug?: string
      locale?: string
    }

    const parsed = matter(mdx)
    const fmInput = { ...parsed.data, slug: parsed.data?.slug ?? slug, locale: parsed.data?.locale ?? locale }
    const validated = FrontmatterSchema.safeParse(fmInput)

    if (!validated.success) {
      return errorResponse("Frontmatter inválido", 422, validated.error.issues)
    }

    const fm = validated.data
    const relFile = filePathFromFM(fm)
    const filePath = path.join(CONTENT_DIR, sanitizeRelativeFile(relFile))

    // Normalizamos el frontmatter escrito (asegurando slug normalizado, defaults, etc.)
    const mdxToWrite = matter.stringify(parsed.content, { ...parsed.data, ...fm })

    if (!overwrite && (await exists(filePath))) {
      return errorResponse("El post ya existe para ese slug y locale", 409)
    }

    await fs.writeFile(filePath, mdxToWrite, "utf8")

    return NextResponse.json({ ok: true, file: relFile, meta: fm }, { status: 201 })
  } catch (e: any) {
    return errorResponse(e?.message || "Error creando el post", 400)
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as { file: string; mdx: string }
    if (!body?.file || typeof body.mdx !== "string") {
      return errorResponse("file y mdx son obligatorios", 400)
    }

    const srcRel = sanitizeRelativeFile(body.file)
    const srcPath = path.join(CONTENT_DIR, srcRel)

    const parsed = matter(body.mdx)
    const fmInput = { ...parsed.data }
    const validated = FrontmatterSchema.safeParse(fmInput)
    if (!validated.success) {
      return errorResponse("Frontmatter inválido", 422, validated.error.issues)
    }
    const fm = validated.data

    const destRel = filePathFromFM(fm)
    const destPath = path.join(CONTENT_DIR, sanitizeRelativeFile(destRel))

    const mdxToWrite = matter.stringify(parsed.content, { ...parsed.data, ...fm })

    if (destRel !== srcRel) {
      // Queremos renombrar el archivo
      if (await exists(destPath)) {
        // ya existe otro archivo destino
        return errorResponse("Ya existe un post con ese slug y locale", 409)
      }
      await fs.writeFile(destPath, mdxToWrite, "utf8")
      // Intentar borrar el origen si es diferente
      try {
        await fs.unlink(srcPath)
      } catch {}
      return NextResponse.json({ ok: true, file: destRel, renamed: true })
    } else {
      await fs.writeFile(srcPath, mdxToWrite, "utf8")
      return NextResponse.json({ ok: true, file: srcRel, renamed: false })
    }
  } catch (e: any) {
    return errorResponse(e?.message || "Error actualizando el post", 400)
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const file = searchParams.get("file")
    if (!file) {
      return errorResponse("Parámetro file requerido", 400)
    }

    const filePath = path.join(CONTENT_DIR, sanitizeRelativeFile(file))
    await fs.unlink(filePath)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return errorResponse(e?.message || "Error borrando el post", 400)
  }
}