/**
 * OpenAI embeddings client over `fetch` — no SDK.
 *
 * Lazy env reads (so tests can import without OPENAI_API_KEY set), retry
 * on 429/5xx with exponential backoff (honouring `Retry-After`), batched
 * requests for `embedBatch`, and AbortSignal support for cancellation.
 *
 * We deliberately do NOT normalize vectors — pgvector applies cosine
 * similarity at query time on the raw embeddings, and normalizing here
 * would lose information for any future use of dot-product or L2.
 */

const ENDPOINT = "https://api.openai.com/v1/embeddings"
const BATCH_SIZE = 100
const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 500
const MAX_DELAY_MS = 4000
const BACKOFF_FACTOR = 2

interface OpenAIEmbeddingItem {
  embedding: number[]
  index: number
}

interface OpenAIEmbeddingResponse {
  data: OpenAIEmbeddingItem[]
  usage?: { prompt_tokens?: number; total_tokens?: number }
}

export async function embedQuery(text: string, signal?: AbortSignal): Promise<number[]> {
  const results = await callEmbeddings([text], signal)
  return results[0]
}

export async function embedBatch(texts: string[], signal?: AbortSignal): Promise<number[][]> {
  if (texts.length === 0) return []
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const part = await callEmbeddings(batch, signal)
    out.push(...part)
  }
  return out
}

async function callEmbeddings(input: string[], signal?: AbortSignal): Promise<number[][]> {
  const { apiKey, model } = readConfig()
  let attempt = 0
  let delay = BASE_DELAY_MS
  let lastError: Error | null = null
  while (attempt < MAX_ATTEMPTS) {
    attempt++
    try {
      const response = await fetchEmbeddings(apiKey, model, input, signal)
      if (response.ok) return parseResponse(await response.json(), input.length)
      if (!shouldRetry(response.status) || attempt >= MAX_ATTEMPTS) {
        const body = await response.text()
        throw new Error(
          `OpenAI embeddings failed: ${response.status} ${response.statusText} — ${body.slice(0, 200)}`,
        )
      }
      const retryAfter = parseRetryAfter(response.headers.get("retry-after"))
      await sleep(retryAfter ?? delay, signal)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (signal?.aborted) throw lastError
      if (attempt >= MAX_ATTEMPTS) throw lastError
      await sleep(delay, signal)
    }
    delay = Math.min(delay * BACKOFF_FACTOR, MAX_DELAY_MS)
  }
  throw lastError ?? new Error("OpenAI embeddings: exhausted retries")
}

const REQUEST_TIMEOUT_MS = 30_000

function fetchEmbeddings(
  apiKey: string,
  model: string,
  input: string[],
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error("OpenAI embeddings request timed out")), REQUEST_TIMEOUT_MS)
  const composite = signal ? mergeSignals(signal, controller.signal) : controller.signal
  return fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input }),
    signal: composite,
  }).finally(() => clearTimeout(timer))
}

function mergeSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const controller = new AbortController()
  const onAbort = (sig: AbortSignal) => () => controller.abort(sig.reason)
  if (a.aborted) controller.abort(a.reason)
  else a.addEventListener("abort", onAbort(a), { once: true })
  if (b.aborted) controller.abort(b.reason)
  else b.addEventListener("abort", onAbort(b), { once: true })
  return controller.signal
}

function parseResponse(json: unknown, expected: number): number[][] {
  const data = (json as OpenAIEmbeddingResponse).data
  if (!Array.isArray(data) || data.length !== expected) {
    throw new Error(`OpenAI embeddings: expected ${expected} vectors, got ${data?.length}`)
  }
  return [...data]
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding)
}

function readConfig(): { apiKey: string; model: string } {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY missing")
  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
  return { apiKey, model }
}

function shouldRetry(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600)
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return Math.min(seconds * 1000, MAX_DELAY_MS)
  return null
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Aborted"))
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new Error("Aborted"))
    }
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}
