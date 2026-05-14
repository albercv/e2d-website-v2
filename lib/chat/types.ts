// Shared types for the AI chat agent runtime.
// Kept dependency-free so they can be imported by route handlers,
// the streaming client, the prompt builder, and tests alike.

export type Locale = 'es' | 'en' | 'it'
export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface RetrievedChunk {
  id: string
  documentId: string
  source: string // 'blog'|'service'|'faq'|'landing'|'ai-answer'
  sourceRef: string
  title: string
  url: string
  content: string
  similarity: number // 0..1, cosine similarity for telemetry
}

export interface BuildMessagesOpts {
  locale: Locale
  systemContext: RetrievedChunk[]
  history: ChatMessage[] // already-stored prior turns
  userInput: string
}

export interface DeepSeekStreamOpts {
  signal?: AbortSignal
  temperature?: number // default 0.4
  maxTokens?: number // default 800
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSec?: number // present when allowed === false
}

export interface ExtractedLead {
  email?: string
  phone?: string
  company?: string
  intent?: string // 'voicebot'|'chatbot'|'automation'|'web'|'crm'|'budget'|'other'
}
