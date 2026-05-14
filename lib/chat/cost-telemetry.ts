/**
 * Cost + token telemetry for the AI chat agent.
 *
 * `estimateCostUsdMicro` is a pure function over a small in-memory price
 * book; values are micro-USD per 1M tokens (so the integer math stays
 * exact across millions of rows). `recordUsage` inserts one row into
 * `chat_usage` and is tolerant of DB failure — telemetry must never
 * break the chat flow.
 */

import { sql } from "drizzle-orm"

import { db } from "@/lib/db/client"
import type { UsageRecord } from "@/lib/chat/types"

interface ModelPrice {
  input: number // micro-USD per 1M input tokens
  output: number // micro-USD per 1M output tokens
}

// micro-USD per 1M tokens. Update when DeepSeek / OpenAI revise pricing.
const PRICE_BOOK: Record<string, ModelPrice> = {
  "deepseek-chat": { input: 270_000, output: 1_100_000 },
}

const EMBEDDING_RATE_PER_M = 20_000 // text-embedding-3-small, micro-USD/M
const UNKNOWN_INPUT_RATE = 200_000
const UNKNOWN_OUTPUT_RATE = 2_000_000

export function estimateCostUsdMicro(
  model: string,
  inputTokens: number,
  outputTokens: number,
  embeddingTokens: number,
): number {
  const price = PRICE_BOOK[model] ?? {
    input: UNKNOWN_INPUT_RATE,
    output: UNKNOWN_OUTPUT_RATE,
  }
  const total =
    inputTokens * price.input +
    outputTokens * price.output +
    embeddingTokens * EMBEDDING_RATE_PER_M
  return Math.round(total / 1_000_000)
}

export async function recordUsage(record: UsageRecord): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO chat_usage (
        session_id, message_id, locale, model,
        input_tokens, output_tokens, total_tokens, embedding_tokens,
        retrieved_chunks, duration_ms, cost_usd_micro
      ) VALUES (
        ${record.sessionId}, ${record.messageId}, ${record.locale}, ${record.model},
        ${record.inputTokens}, ${record.outputTokens}, ${record.totalTokens}, ${record.embeddingTokens},
        ${record.retrievedChunks}, ${record.durationMs}, ${record.costUsdMicro}
      )
    `)
  } catch (err) {
    // Telemetry must never break the chat flow. Log and move on.
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[chat-usage] insert failed: ${msg}`)
  }
}

interface ChatUsageArgs {
  sessionId: string
  messageId: string | null
  locale: UsageRecord["locale"]
  model: string
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  embeddingTokens: number | null
  retrievedChunks: number
  durationMs: number
}

/**
 * Failure-tolerant wrapper around `recordChatUsage` for use inside the
 * SSE stream lifecycle, where any thrown promise must never escape.
 * The chat route should call this exactly once per successful response.
 */
export async function safeRecordChatUsage(args: ChatUsageArgs): Promise<void> {
  try {
    await recordChatUsage(args)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[chat-usage] wrapper failed: ${msg}`)
  }
}

/**
 * Streaming-response convenience: DeepSeek's stream only yields a single
 * `totalTokens`, so input/output/embedding splits are unknown. The chat
 * route calls this as a one-liner after each successful response.
 */
export async function recordStreamResponseUsage(args: {
  sessionId: string
  messageId: string | null
  locale: UsageRecord["locale"]
  totalTokens: number
  retrievedChunks: number
  durationMs: number
}): Promise<void> {
  await safeRecordChatUsage({
    sessionId: args.sessionId,
    messageId: args.messageId,
    locale: args.locale,
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    inputTokens: null,
    outputTokens: null,
    totalTokens: args.totalTokens > 0 ? args.totalTokens : null,
    embeddingTokens: null,
    retrievedChunks: args.retrievedChunks,
    durationMs: args.durationMs,
  })
}

/**
 * Convenience wrapper so the chat route can record usage with a single
 * call. Computes the cost estimate from the supplied token counts and
 * forwards to `recordUsage`. Failure-tolerant by virtue of `recordUsage`.
 */
export async function recordChatUsage(args: ChatUsageArgs): Promise<void> {
  const input = args.inputTokens ?? 0
  const output = args.outputTokens ?? 0
  const embedding = args.embeddingTokens ?? 0
  // If DeepSeek only returned a single total, attribute it to output as
  // a conservative approximation (output is ~4x input rate).
  const totalFallback = input === 0 && output === 0 ? args.totalTokens ?? 0 : 0
  const costUsdMicro = estimateCostUsdMicro(
    args.model,
    input,
    output + totalFallback,
    embedding,
  )
  await recordUsage({
    sessionId: args.sessionId,
    messageId: args.messageId,
    locale: args.locale,
    model: args.model,
    inputTokens: args.inputTokens,
    outputTokens: args.outputTokens,
    totalTokens: args.totalTokens,
    embeddingTokens: args.embeddingTokens,
    retrievedChunks: args.retrievedChunks,
    durationMs: args.durationMs,
    costUsdMicro,
  })
}
