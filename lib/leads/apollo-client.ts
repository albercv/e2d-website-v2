/**
 * Thin Apollo.io REST client for contact upsert.
 *
 * Uses HTTPS fetch directly (no SDK) to keep the install surface flat and
 * avoid pulling Node-only transports into the Next.js bundle. The MCP
 * Apollo tools are intentionally NOT used: they require an OAuth dance
 * that does not exist in the chat handler's server context.
 *
 * Payload-shape sources (retrieved 2026-05-15):
 *   - https://docs.apollo.io/reference/create-a-contact
 *   - https://docs.apollo.io/docs/api-overview
 *   - https://endgrate.com/blog/using-the-apollo-api-to-create-or-update-contacts-(with-javascript-examples)
 *
 * Apollo's POST /v1/contacts accepts:
 *   - first_name, last_name (separate strings — NOT a single `name`)
 *   - email
 *   - organization_name (string — triggers a fuzzy account match server-side)
 *   - direct_phone / mobile_phone / corporate_phone / home_phone / other_phone
 *     as INDIVIDUAL TOP-LEVEL STRINGS — there is no `phone_numbers` array.
 *   - label_names: string[] — short tag names; long free-text labels (>~50
 *     chars) get rejected with 422 "There is something wrong with your
 *     request." Notes therefore go to a custom field, not a label.
 *
 * Auth header is `X-Api-Key`.
 */

const APOLLO_ENDPOINT = "https://api.apollo.io/api/v1/contacts"

const REQUEST_TIMEOUT_MS = 30_000
const MAX_RETRY_ATTEMPTS = 3
const RETRY_BASE_MS = 500
const RETRY_FACTOR = 2
const RETRY_CAP_MS = 4_000
const NOTE_MAX_CHARS = 200
const ERROR_BODY_SLICE = 1024
const APOLLO_LEAD_LABEL = "e2d-chat-lead"

export interface ApolloContactInput {
  email?: string
  name?: string
  phone?: string
  company?: string
  notes?: string
}

export interface ApolloContactResponse {
  id: string
}

interface ApolloRequestBody {
  first_name?: string
  last_name?: string
  email?: string
  organization_name?: string
  direct_phone?: string
  label_names?: string[]
  typed_custom_fields?: Record<string, string>
}

interface ApolloResponseShape {
  contact?: { id?: string }
}

function readApiKey(): string {
  const key = process.env.APOLLO_API_KEY
  if (!key) throw new Error("APOLLO_API_KEY missing")
  return key
}

function splitName(full: string): { first?: string; last?: string } {
  const trimmed = full.trim()
  if (!trimmed) return {}
  const idx = trimmed.search(/\s+/)
  if (idx === -1) return { first: trimmed }
  return {
    first: trimmed.slice(0, idx),
    last: trimmed.slice(idx).trim() || undefined,
  }
}

function buildBody(input: ApolloContactInput): ApolloRequestBody {
  const body: ApolloRequestBody = {}
  if (input.name) {
    const { first, last } = splitName(input.name)
    if (first) body.first_name = first
    if (last) body.last_name = last
  }
  if (input.email) body.email = input.email
  if (input.company) body.organization_name = input.company
  if (input.phone) body.direct_phone = input.phone
  body.label_names = [APOLLO_LEAD_LABEL]
  if (input.notes) {
    const trimmed = input.notes.slice(0, NOTE_MAX_CHARS)
    // Apollo rejects long free-text labels; stash the note under a typed
    // custom field instead. The field name "e2d_chat_intent" must already
    // exist in Apollo (or the API silently drops it — non-fatal).
    body.typed_custom_fields = { e2d_chat_intent: trimmed }
  }
  return body
}

function maskKey(k: string): string {
  if (k.length <= 8) return "****"
  return `${k.slice(0, 4)}…${k.slice(-2)}`
}

function logRequest(body: ApolloRequestBody, apiKey: string): void {
  // eslint-disable-next-line no-console -- diagnostic for sync drainer
  console.log(
    `[apollo-client] POST ${APOLLO_ENDPOINT} key=${maskKey(apiKey)} body=${JSON.stringify(body)}`,
  )
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
        "X-Api-Key": apiKey,
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
  logRequest(body, apiKey)
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
