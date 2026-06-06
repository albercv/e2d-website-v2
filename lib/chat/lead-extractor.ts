// Heuristic lead extractor — regex + keyword intent classifier.
// No LLM calls; cheap to run on every user turn.
// Intent groups mirror getAgentResponse in components/ai-agent/ai-agent-modal.tsx.

import type { ExtractedLead } from './types'

const EMAIL_RE = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i
const PHONE_RE = /(?:\+?\d[\d\s\-.()]{7,}\d)/
const COMPANY_RE = /(?:empresa|company|azienda)\s*:\s*([^\n\r]{1,80})/i

interface IntentRule {
  intent: string
  pattern: RegExp
}

// Order matters: first match wins. Budget is intentionally checked before
// generic "web/desarrollo" so explicit pricing asks always classify as budget.
const INTENT_RULES: IntentRule[] = [
  { intent: 'voicebot', pattern: /\b(voicebot|voz|voice|agente\s+voz)\b/i },
  { intent: 'budget', pattern: /\b(presupuesto|quote|precio|preventivo)\b/i },
  { intent: 'chatbot', pattern: /\b(whatsapp|chatbot|bot)\b/i },
  { intent: 'automation', pattern: /\b(automatizaci[óo]n|automation|automazione)\b/i },
  { intent: 'crm', pattern: /\b(crm|integraci[óo]n|integrazione|sistema)\b/i },
  { intent: 'web', pattern: /\b(web|desarrollo|sitio)\b/i },
]

function detectIntent(text: string): string | undefined {
  for (const rule of INTENT_RULES) {
    if (rule.pattern.test(text)) return rule.intent
  }
  // Only fall back to 'other' when text is non-trivial — empty input has no intent.
  return text.trim().length > 0 ? 'other' : undefined
}

function extractEmail(text: string): string | undefined {
  const m = text.match(EMAIL_RE)
  return m ? m[0].trim().toLowerCase() : undefined
}

function extractPhone(text: string): string | undefined {
  const m = text.match(PHONE_RE)
  if (!m) return undefined
  return m[0].replace(/\s+/g, '')
}

function extractCompany(text: string): string | undefined {
  const m = text.match(COMPANY_RE)
  if (!m) return undefined
  const value = m[1].trim()
  return value.length > 0 ? value : undefined
}

export function extractLead(text: string): ExtractedLead | null {
  const email = extractEmail(text)
  const phone = extractPhone(text)
  const company = extractCompany(text)
  const intent = detectIntent(text)

  // Spec: return null when none of email/phone/intent matched.
  // 'other' alone (no signal) shouldn't bubble up either.
  const hasIntentSignal = intent !== undefined && intent !== 'other'
  if (!email && !phone && !hasIntentSignal) return null

  const lead: ExtractedLead = {}
  if (email) lead.email = email
  if (phone) lead.phone = phone
  if (company) lead.company = company
  if (intent) lead.intent = intent
  return lead
}
