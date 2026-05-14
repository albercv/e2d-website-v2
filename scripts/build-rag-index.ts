#!/usr/bin/env tsx
/**
 * CLI wrapper around `lib/rag/indexer.ts:rebuildIndex`.
 *
 * Usage:
 *   tsx scripts/build-rag-index.ts [flags]
 *
 * Flags:
 *   --full              ignore content_hash diffing; re-embed everything
 *   --locale=es,en      restrict to a comma-separated locale subset
 *   --source=blog,faq   restrict to a comma-separated source subset
 *   --dry-run           plan only — no DB writes
 *
 * Wired into package.json as `npm run rag:index`.
 */

import { rebuildIndex } from "@/lib/rag/indexer"
import type { IndexerOptions, Locale, SourceKind } from "@/lib/rag/types"

const VALID_LOCALES: Locale[] = ["es", "en", "it"]
const VALID_SOURCES: SourceKind[] = ["blog", "service", "faq", "landing", "ai-answer"]

function parseArgs(argv: string[]): IndexerOptions {
  const opts: IndexerOptions = {}
  for (const arg of argv) {
    if (arg === "--full") opts.full = true
    else if (arg === "--dry-run") opts.dryRun = true
    else if (arg.startsWith("--locale=")) opts.locales = parseLocales(arg.slice(9))
    else if (arg.startsWith("--source=")) opts.sources = parseSources(arg.slice(9))
  }
  return opts
}

function parseLocales(value: string): Locale[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is Locale => (VALID_LOCALES as string[]).includes(v))
}

function parseSources(value: string): SourceKind[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is SourceKind => (VALID_SOURCES as string[]).includes(v))
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2))
  const stats = await rebuildIndex(opts)
  console.log(JSON.stringify(stats, null, 2))
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`[rag/build] failed: ${message}`)
  process.exit(1)
})
