/**
 * Thin Resend REST client for transactional sends.
 *
 * Uses HTTPS fetch directly — no SDK, to keep the install surface flat and
 * mirror the convention already established by `lib/leads/apollo-client.ts`.
 * Env vars are read lazily so unit tests can stub them per-call and so the
 * module can be imported in build steps without crashing.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails"

const REQUEST_TIMEOUT_MS = 30_000
const MAX_RETRY_ATTEMPTS = 3
const RETRY_BASE_MS = 500
const RETRY_FACTOR = 2
const RETRY_CAP_MS = 4_000
const ERROR_BODY_SLICE = 200

export interface ResendSendInput {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

interface ResendRequestBody {
  from: string
  to: string | string[]
  subject: string
  html: string
  text?: string
  reply_to?: string
}

interface ResendResponseShape {
  id?: string
}

function readApiKey(): string {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY missing")
  return key
}

function readFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) throw new Error("RESEND_FROM_EMAIL missing")
  return from
}

function buildBody(input: ResendSendInput, from: string): ResendRequestBody {
  const body: ResendRequestBody = {
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  }
  if (input.text) body.text = input.text
  if (input.replyTo) body.reply_to = input.replyTo
  return body
}

function backoffMs(attempt: number): number {
  const base = RETRY_BASE_MS * Math.pow(RETRY_FACTOR, attempt)
  return Math.min(base, RETRY_CAP_MS)
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const date = Date.parse(header)
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now())
  return null
}

function isRetriable(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599)
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("aborted"))
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t)
        reject(new Error("aborted"))
      },
      { once: true },
    )
  })
}

function composeAbortSignal(
  timeoutMs: number,
  external?: AbortSignal,
): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController()
  const onExternalAbort = (): void => controller.abort()
  if (external) {
    if (external.aborted) controller.abort()
    else external.addEventListener("abort", onExternalAbort, { once: true })
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return {
    signal: controller.signal,
    cancel: () => {
      clearTimeout(timer)
      external?.removeEventListener("abort", onExternalAbort)
    },
  }
}

async function performRequest(
  body: ResendRequestBody,
  apiKey: string,
  external?: AbortSignal,
): Promise<Response> {
  const { signal, cancel } = composeAbortSignal(REQUEST_TIMEOUT_MS, external)
  try {
    return await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    })
  } finally {
    cancel()
  }
}

async function extractId(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as ResendResponseShape | null
  const id = data?.id
  if (!id || typeof id !== "string") {
    throw new Error("Resend send failed: response missing id")
  }
  return id
}

async function describeFailure(response: Response): Promise<string> {
  const raw = await response.text().catch(() => "")
  const slice = raw.slice(0, ERROR_BODY_SLICE)
  return `Resend send failed: ${response.status} ${response.statusText} — ${slice}`
}

export async function sendEmail(
  input: ResendSendInput,
  signal?: AbortSignal,
): Promise<{ id: string }> {
  const apiKey = readApiKey()
  const from = readFromAddress()
  const body = buildBody(input, from)
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    let response: Response
    try {
      response = await performRequest(body, apiKey, signal)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt === MAX_RETRY_ATTEMPTS - 1) throw lastError
      await delay(backoffMs(attempt), signal)
      continue
    }

    if (response.ok) {
      const id = await extractId(response)
      return { id }
    }

    if (!isRetriable(response.status) || attempt === MAX_RETRY_ATTEMPTS - 1) {
      throw new Error(await describeFailure(response))
    }

    const retryAfter = parseRetryAfter(response.headers.get("retry-after"))
    await delay(retryAfter ?? backoffMs(attempt), signal)
  }

  throw lastError ?? new Error("Resend send failed: exhausted retries")
}
