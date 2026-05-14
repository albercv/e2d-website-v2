/**
 * Shared types for the RAG ingestion pipeline.
 *
 * Pure types — no runtime, no I/O. Consumed by chunker, embeddings client,
 * source readers, indexer, and the CLI wrapper.
 */

export type Locale = "es" | "en" | "it"

export type SourceKind = "blog" | "service" | "faq" | "landing" | "ai-answer"

export interface RawDocument {
  source: SourceKind
  /** Slug or path uniquely identifying the document within its source. */
  sourceRef: string
  locale: Locale
  title: string
  url: string
  /** Markdown or plain text body to chunk and embed. */
  body: string
}

export interface Chunk {
  /** Zero-based position within the parent document. */
  index: number
  content: string
  tokenCount: number
}

export interface IndexerOptions {
  /** If true, ignore content_hash diffing and re-embed everything. */
  full?: boolean
  /** Restrict to a subset of locales (default: all). */
  locales?: Locale[]
  /** Restrict to a subset of sources (default: all). */
  sources?: SourceKind[]
  /** Log planned operations without DB writes. */
  dryRun?: boolean
}

export interface IndexerStats {
  documentsScanned: number
  documentsUpdated: number
  chunksUpserted: number
  chunksSkipped: number
  embeddingTokens: number
}
