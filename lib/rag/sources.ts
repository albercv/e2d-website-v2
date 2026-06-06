/**
 * Content source readers for the RAG ingestion pipeline.
 *
 * Each reader returns a list of `RawDocument` items normalized for the
 * chunker + embedder. A failure in one source is logged via console.warn
 * and yields an empty list — the pipeline never aborts because, say, the
 * FAQ module moved.
 *
 * Sources:
 *  - Blog: MDX files under `process.env.BLOG_POSTS_DIR ?? 'content'`,
 *    parsed with `gray-matter`. We do not depend on contentlayer/generated
 *    here because the build artefact is not always available at script
 *    time (CI, fresh checkouts).
 *  - Services: i18n message files in `messages/*.json`, `services` block.
 *    Each service key becomes its own document per locale.
 *  - FAQ: `FAQ_DATA` from `@/lib/faq/faq-data`, one document per Q&A.
 *  - AI answers: query-driven (no static corpus); returns [] with a note.
 */

import * as fs from "fs/promises"
import * as path from "path"

import matter from "gray-matter"

import { FAQ_DATA, type FaqLocaleData } from "@/lib/faq/faq-data"

import type { Locale, RawDocument } from "./types"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://evolve2digital.com"
const LOCALES: Locale[] = ["es", "en", "it"]

export async function readAllSources(): Promise<RawDocument[]> {
  const results = await Promise.all([
    readBlogPosts(),
    readServicePages(),
    readFaqs(),
    readAiAnswers(),
    readAboutDocs(),
  ])
  return results.flat()
}

export async function readAboutDocs(): Promise<RawDocument[]> {
  try {
    const dir = path.resolve(process.cwd(), "content", "about")
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = entries.filter((e) => e.isFile() && e.name.endsWith(".md"))
    const docs = await Promise.all(files.map((file) => readAboutFile(dir, file.name)))
    return docs.filter((d): d is RawDocument => d !== null)
  } catch (err) {
    console.warn(`[rag/sources] about reader failed: ${describeError(err)}`)
    return []
  }
}

async function readAboutFile(dir: string, filename: string): Promise<RawDocument | null> {
  const fullPath = path.join(dir, filename)
  const raw = await fs.readFile(fullPath, "utf8")
  const parsed = matter(raw)
  const fm = parsed.data as Record<string, unknown>
  const locale = fm.locale as Locale | undefined
  const slug = fm.slug as string | undefined
  const title = fm.title as string | undefined
  if (!locale || !slug || !title) return null
  return {
    source: "about",
    sourceRef: slug,
    locale,
    title,
    url: `${BASE_URL}/${locale}`,
    body: parsed.content.trim(),
  }
}

export async function readBlogPosts(): Promise<RawDocument[]> {
  try {
    const dir = path.resolve(process.cwd(), process.env.BLOG_POSTS_DIR || "content")
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = entries.filter((e) => e.isFile() && e.name.endsWith(".mdx"))
    const docs = await Promise.all(files.map((file) => readBlogFile(dir, file.name)))
    return docs.filter((d): d is RawDocument => d !== null)
  } catch (err) {
    console.warn(`[rag/sources] blog reader failed: ${describeError(err)}`)
    return []
  }
}

async function readBlogFile(dir: string, filename: string): Promise<RawDocument | null> {
  const fullPath = path.join(dir, filename)
  const raw = await fs.readFile(fullPath, "utf8")
  const parsed = matter(raw)
  const fm = parsed.data as Record<string, unknown>
  const locale = fm.locale as Locale | undefined
  const slug = fm.slug as string | undefined
  const title = fm.title as string | undefined
  const published = fm.published as boolean | undefined
  if (!locale || !slug || !title) return null
  if (published === false) return null
  return {
    source: "blog",
    sourceRef: slug,
    locale,
    title,
    url: `${BASE_URL}/${locale}/blog/${slug}`,
    body: parsed.content.trim(),
  }
}

export async function readServicePages(): Promise<RawDocument[]> {
  try {
    const docs: RawDocument[] = []
    for (const locale of LOCALES) {
      const services = await loadServices(locale)
      for (const [key, service] of Object.entries(services)) {
        const doc = serviceToDocument(locale, key, service)
        if (doc) docs.push(doc)
      }
    }
    if (docs.length === 0) console.warn("[rag/sources] services: no entries found")
    return docs
  } catch (err) {
    console.warn(`[rag/sources] services reader failed: ${describeError(err)}`)
    return []
  }
}

async function loadServices(locale: Locale): Promise<Record<string, unknown>> {
  const file = path.resolve(process.cwd(), "messages", `${locale}.json`)
  const raw = await fs.readFile(file, "utf8")
  const json = JSON.parse(raw) as Record<string, unknown>
  const services = json.services
  if (!services || typeof services !== "object") return {}
  const { title: _t, subtitle: _s, ...rest } = services as Record<string, unknown>
  return rest
}

function serviceToDocument(
  locale: Locale,
  key: string,
  raw: unknown,
): RawDocument | null {
  if (!raw || typeof raw !== "object") return null
  const data = raw as Record<string, unknown>
  const title = typeof data.title === "string" ? data.title : null
  if (!title) return null
  const description = typeof data.description === "string" ? data.description : ""
  const tooltip = typeof data.tooltip === "string" ? data.tooltip : ""
  const body = [description, tooltip].filter(Boolean).join("\n\n")
  if (!body) return null
  return {
    source: "service",
    sourceRef: key,
    locale,
    title,
    url: `${BASE_URL}/${locale}#${key}`,
    body,
  }
}

export async function readFaqs(): Promise<RawDocument[]> {
  try {
    const docs: RawDocument[] = []
    for (const locale of LOCALES) {
      const data = FAQ_DATA[locale] as FaqLocaleData | undefined
      if (!data) continue
      data.items.forEach((item, idx) => {
        docs.push(faqToDocument(locale, idx, item.question, item.answer))
      })
    }
    return docs
  } catch (err) {
    console.warn(`[rag/sources] faq reader failed: ${describeError(err)}`)
    return []
  }
}

function faqToDocument(
  locale: Locale,
  index: number,
  question: string,
  answer: string,
): RawDocument {
  return {
    source: "faq",
    sourceRef: `${locale}-${index}`,
    locale,
    title: question,
    url: `${BASE_URL}/${locale}#faq-${index}`,
    body: answer,
  }
}

export async function readAiAnswers(): Promise<RawDocument[]> {
  // AIAnswersService in lib/ai-answers-service.ts is query-driven: it
  // generates answers on-demand from the blog corpus rather than exposing
  // a static "answers" dataset. Indexing the blog covers the same ground,
  // so this reader is intentionally a no-op until a dedicated AI-answer
  // corpus exists.
  console.warn("[rag/sources] ai-answers: query-driven, no static corpus — skipping")
  return []
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
