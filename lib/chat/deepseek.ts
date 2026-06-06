// DeepSeek streaming client (OpenAI-compatible Chat Completions).
// Pure fetch + SSE parsing — no SDK dependency.
// Env vars are read inside functions so imports stay side-effect free.

import type { ChatMessage, DeepSeekStreamOpts } from './types'

interface DeepSeekConfig {
  apiKey: string
  baseUrl: string
  model: string
}

interface DeltaFrame {
  choices?: Array<{ delta?: { content?: string } }>
  usage?: { total_tokens?: number }
}

const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-chat'
const DEFAULT_TEMPERATURE = 0.4
const DEFAULT_MAX_TOKENS = 800

function loadConfig(): DeepSeekConfig {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set; cannot call DeepSeek API.')
  }
  return {
    apiKey,
    baseUrl: process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL,
    model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
  }
}

function buildRequest(
  cfg: DeepSeekConfig,
  messages: ChatMessage[],
  opts: DeepSeekStreamOpts | undefined,
): { url: string; init: RequestInit } {
  const body = {
    model: cfg.model,
    messages,
    stream: true,
    stream_options: { include_usage: true },
    temperature: opts?.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: opts?.maxTokens ?? DEFAULT_MAX_TOKENS,
  }
  return {
    url: `${cfg.baseUrl}/v1/chat/completions`,
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal: opts?.signal,
    },
  }
}

function parseSseFrame(raw: string): DeltaFrame | null {
  // SSE frames are "data: <payload>\n\n"; ignore comments and [DONE] sentinel.
  const trimmed = raw.trim()
  if (!trimmed || !trimmed.startsWith('data:')) return null
  const payload = trimmed.slice(5).trim()
  if (!payload || payload === '[DONE]') return null
  try {
    return JSON.parse(payload) as DeltaFrame
  } catch (err) {
    // Malformed frames are skipped rather than aborting the whole stream.
    throw new Error(
      `DeepSeek SSE parse error: ${(err as Error).message}; frame=${payload.slice(0, 120)}`,
    )
  }
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text()
    return text.slice(0, 200)
  } catch {
    // We do not want a secondary failure to mask the HTTP status.
    return '<unreadable body>'
  }
}

export async function* streamCompletion(
  messages: ChatMessage[],
  opts?: DeepSeekStreamOpts,
): AsyncGenerator<string, { totalTokens: number }, void> {
  const cfg = loadConfig()
  const { url, init } = buildRequest(cfg, messages, opts)
  const res = await fetch(url, init)
  if (!res.ok || !res.body) {
    const body = res.body ? await readErrorBody(res) : '<no body>'
    throw new Error(`DeepSeek HTTP ${res.status}: ${body}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let totalTokens = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        const frame = parseSseFrame(part)
        if (!frame) continue
        if (frame.usage?.total_tokens) totalTokens = frame.usage.total_tokens
        const piece = frame.choices?.[0]?.delta?.content
        if (piece) yield piece
      }
    }
  } finally {
    reader.releaseLock()
  }
  return { totalTokens }
}
