/**
 * Markdown chunker for the RAG pipeline.
 *
 * Pure functions only — no I/O. Splits a markdown body into ~target-token
 * chunks while preserving semantic units (headings, paragraphs) and
 * applying a sliding-window token overlap between adjacent chunks.
 *
 * Tokenization uses `gpt-tokenizer` (cl100k_base) — same encoding as the
 * OpenAI `text-embedding-3-small` model so chunk sizes line up with the
 * model's input budget.
 */

import { encode, decode } from "gpt-tokenizer"

import type { Chunk } from "./types"

const DEFAULT_TARGET_TOKENS = 500
const DEFAULT_OVERLAP_TOKENS = 50

export interface ChunkerOptions {
  targetTokens?: number
  overlapTokens?: number
}

export function chunkMarkdown(body: string, opts: ChunkerOptions = {}): Chunk[] {
  const targetTokens = opts.targetTokens ?? DEFAULT_TARGET_TOKENS
  const overlapTokens = opts.overlapTokens ?? DEFAULT_OVERLAP_TOKENS
  const trimmed = body.trim()
  if (!trimmed) return []

  const sections = splitByHeadings(trimmed)
  const raw: string[] = []
  for (const section of sections) {
    if (countTokens(section) <= targetTokens) {
      raw.push(section)
      continue
    }
    raw.push(...splitByParagraphs(section, targetTokens))
  }

  const withOverlap = applyOverlap(raw, overlapTokens)
  return withOverlap
    .map((content, index) => ({
      index,
      content,
      tokenCount: countTokens(content),
    }))
    .filter((c) => c.content.trim().length > 0)
    .map((c, i) => ({ ...c, index: i }))
}

/**
 * Splits markdown by top-level headings (#, ##, ###). Anything before the
 * first heading becomes its own section so we never lose prose.
 */
function splitByHeadings(body: string): string[] {
  const lines = body.split("\n")
  const sections: string[] = []
  let current: string[] = []
  for (const line of lines) {
    if (/^#{1,3} /.test(line) && current.length > 0) {
      sections.push(current.join("\n").trim())
      current = [line]
      continue
    }
    current.push(line)
  }
  if (current.length > 0) sections.push(current.join("\n").trim())
  return sections.filter((s) => s.length > 0)
}

/**
 * Splits a section into chunks no larger than targetTokens, breaking on
 * paragraph boundaries (blank lines) so we don't cut mid-paragraph.
 */
function splitByParagraphs(section: string, targetTokens: number): string[] {
  const paragraphs = section.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const chunks: string[] = []
  let buffer: string[] = []
  let bufferTokens = 0
  for (const paragraph of paragraphs) {
    const tokens = countTokens(paragraph)
    if (bufferTokens + tokens > targetTokens && buffer.length > 0) {
      chunks.push(buffer.join("\n\n"))
      buffer = []
      bufferTokens = 0
    }
    buffer.push(paragraph)
    bufferTokens += tokens
  }
  if (buffer.length > 0) chunks.push(buffer.join("\n\n"))
  return chunks
}

/**
 * Carries the last `overlapTokens` tokens of each chunk forward as a
 * prefix on the next chunk. Improves retrieval across boundaries without
 * duplicating large amounts of content.
 */
function applyOverlap(chunks: string[], overlapTokens: number): string[] {
  if (overlapTokens <= 0 || chunks.length <= 1) return chunks
  const out: string[] = [chunks[0]]
  for (let i = 1; i < chunks.length; i++) {
    const prevTokens = encode(chunks[i - 1])
    const tail = prevTokens.slice(-overlapTokens)
    const prefix = tail.length > 0 ? decode(tail) : ""
    const joined = prefix ? `${prefix}\n\n${chunks[i]}` : chunks[i]
    out.push(joined)
  }
  return out
}

function countTokens(text: string): number {
  return encode(text).length
}
