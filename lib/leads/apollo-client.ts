/**
 * Thin Apollo.io REST client for contact upsert.
 *
 * Uses HTTPS fetch directly (no SDK) to keep the install surface flat and
 * avoid pulling Node-only transports into the Next.js bundle. The MCP
 * Apollo tools are intentionally NOT used: they require an OAuth dance
 * that does not exist in the chat handler's server context.
 *
 * Payload-shape assumption:
 *   The Apollo /v1/contacts upsert accepts `email` (required) plus optional
 *   `organization_name`, `phone_numbers: string[]`, and `label_names: string[]`.
 *   We do NOT have first/last name on chat leads, so we send the minimal
 *   shape. Notes (if any) are prefixed with "e2d-note:" and attached as an
 *   extra label so they show up on the contact card.
 */

const APOLLO_ENDPOINT = "https://api.apollo.io/api/v1/contacts"

const REQUEST_TIMEOUT_MS = 30_000
const MAX_RETRY_ATTEMPTS = 3
const RETRY_BASE_MS = 500
const RETRY_FACTOR = 2
const RETRY_CAP_MS = 4_000
const NOTE_MAX_CHARS = 200
const ERROR_BODY_SLICE = 200

export interface ApolloContactInput {
  email?: string
  phone?: string
  company?: string
  notes?: string
}

export interface ApolloContactResponse {
  id: string
}

interface ApolloRequestBody {
  email?: string
  organization_name?: string
  phone_numbers?: string[]
  label_names?: string[]
}

interface ApolloResponseShape {
  contact?: { id?: string }
}

function readApiKey(): string {
  const key = process.env.APOLLO_API_KEY
  if (!key) throw new Error("APOLLO_API_KEY missing")
  return key
}

function buildBody(input: ApolloContactInput): ApolloRequestBody {
  const body: ApolloRequestBody = {}
  if (input.email) body.email = input.email
  if (input.company) body.organization_name = input.company
  if (input.phone) body.phone_numbers = [input.phone]
  const labels: string[] = ["e2d-chat-lead"]
  if (input.notes) {
    const trimmed = input.notes.slice(0, NOTE_MAX_CHARS)
    labels.push(`e2d-note:${trimmed}`)
  }
  body.label_names = labels
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

function composeAbortSignal(timeoutMs: number, external?: AbortSignal): {
  signal: AbortSignal
  cancel: () => void
} {
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
  body: ApolloRequestBody,
  apiKey: string,
  external?: AbortSignal,
): Promise<Response> {
  const { signal, cancel } = composeAbortSignal(REQUEST_TIMEOUT_MS, external)
  try {
    return await fetch(APOLLO_ENDPOINT, {
      method: "POST",
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal,
    })
  } finally {
    cancel()
  }
}

async function extractContactId(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as ApolloResponseShape | null
  const id = data?.contact?.id
  if (!id || typeof id !== "string") {
    throw new Error("Apollo contact create failed: response missing contact.id")
  }
  return id
}

async function describeFailure(response: Response): Promise<string> {
  const raw = await response.text().catch(() => "")
  const slice = raw.slice(0, ERROR_BODY_SLICE)
  return `Apollo contact create failed: ${response.status} ${response.statusText} — ${slice}`
}

export async function createOrUpdateContact(
  input: ApolloContactInput,
  signal?: AbortSignal,
): Promise<ApolloContactResponse> {
  const apiKey = readApiKey()
  const body = buildBody(input)
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
      const id = await extractContactId(response)
      return { id }
    }

    if (!isRetriable(response.status) || attempt === MAX_RETRY_ATTEMPTS - 1) {
      throw new Error(await describeFailure(response))
    }

    const retryAfter = parseRetryAfter(response.headers.get("retry-after"))
    await delay(retryAfter ?? backoffMs(attempt), signal)
  }

  throw lastError ?? new Error("Apollo contact create failed: exhausted retries")
}
