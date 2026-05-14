// Builds the localized system prompt and the final message list sent to DeepSeek.
// Reads CHAT_MAX_HISTORY_TURNS lazily so tests can override it.

import type {
  BuildMessagesOpts,
  ChatMessage,
  Locale,
  RetrievedChunk,
} from './types'

const DEFAULT_MAX_TURNS = 10
const CONTACT_WHATSAPP = '+34 605 497 639'
const CONTACT_EMAIL = 'hello@evolve2digital.com'

interface LocalizedTemplate {
  intro: string
  domain: string
  tone: string
  rules: string[]
  contextHeader: string
  emptyContext: string
}

const TEMPLATES: Record<Locale, LocalizedTemplate> = {
  es: {
    intro: 'Eres el asistente de Evolve2Digital (E2D).',
    domain:
      'Dominio: automatización empresarial — voicebots, chatbots de WhatsApp, agentes de voz, integraciones y desarrollo web.',
    tone: 'Tono: profesional, breve, útil.',
    rules: [
      'Responde SOLO con información presente en el "Contexto" o derivada lógicamente de él.',
      `Si no encuentras la respuesta en el contexto, di "no tengo esa información" y ofrece WhatsApp ${CONTACT_WHATSAPP} / ${CONTACT_EMAIL}.`,
      `Si el usuario pide presupuesto, agendar o hablar con humano, ofrece WhatsApp ${CONTACT_WHATSAPP} / ${CONTACT_EMAIL}.`,
      'Nunca inventes precios, garantías ni casos de éxito específicos.',
      'Cita la fuente cuando uses contexto, formato `[fuente: <title>](url)`.',
    ],
    contextHeader: '## Contexto',
    emptyContext:
      '(sin contexto recuperado) — apóyate en redirigir al contacto humano cuando proceda.',
  },
  en: {
    intro: 'You are the assistant of Evolve2Digital (E2D).',
    domain:
      'Domain: business automation — voicebots, WhatsApp chatbots, voice agents, integrations and web development.',
    tone: 'Tone: professional, concise, helpful.',
    rules: [
      'Answer ONLY with information present in the "Context" or logically derived from it.',
      `If the answer is not in the context, say "I do not have that information" and offer WhatsApp ${CONTACT_WHATSAPP} / ${CONTACT_EMAIL}.`,
      `If the user requests a quote, booking, or human contact, offer WhatsApp ${CONTACT_WHATSAPP} / ${CONTACT_EMAIL}.`,
      'Never invent prices, guarantees, or specific case studies.',
      'Cite the source when using context, format `[source: <title>](url)`.',
    ],
    contextHeader: '## Context',
    emptyContext:
      '(no retrieved context) — lean on redirecting to the human contact channels when appropriate.',
  },
  it: {
    intro: 'Sei l’assistente di Evolve2Digital (E2D).',
    domain:
      'Dominio: automazione aziendale — voicebot, chatbot WhatsApp, agenti vocali, integrazioni e sviluppo web.',
    tone: 'Tono: professionale, breve, utile.',
    rules: [
      'Rispondi SOLO con informazioni presenti nel "Contesto" o logicamente derivate da esso.',
      `Se la risposta non è nel contesto, dì "non ho questa informazione" e offri WhatsApp ${CONTACT_WHATSAPP} / ${CONTACT_EMAIL}.`,
      `Se l’utente chiede un preventivo, un appuntamento o di parlare con un umano, offri WhatsApp ${CONTACT_WHATSAPP} / ${CONTACT_EMAIL}.`,
      'Non inventare mai prezzi, garanzie o casi di successo specifici.',
      'Cita la fonte quando usi il contesto, formato `[fonte: <title>](url)`.',
    ],
    contextHeader: '## Contesto',
    emptyContext:
      '(nessun contesto recuperato) — appoggiati al reindirizzamento ai contatti umani quando opportuno.',
  },
}

function renderChunks(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c) => `### ${c.title}\n<${c.url}>\n${c.content}`)
    .join('\n\n')
}

function renderRules(rules: string[]): string {
  return rules.map((r, i) => `${i + 1}. ${r}`).join('\n')
}

export function buildSystemPrompt(opts: {
  locale: Locale
  chunks: RetrievedChunk[]
}): string {
  const tpl = TEMPLATES[opts.locale]
  const header = `${tpl.intro}\n${tpl.domain}\n${tpl.tone}`
  const rules = renderRules(tpl.rules)
  const contextBody =
    opts.chunks.length === 0 ? tpl.emptyContext : renderChunks(opts.chunks)
  return `${header}\n\n${rules}\n\n${tpl.contextHeader}\n${contextBody}`
}

function readMaxTurns(): number {
  const raw = process.env.CHAT_MAX_HISTORY_TURNS
  if (!raw) return DEFAULT_MAX_TURNS
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_TURNS
}

function truncateHistory(history: ChatMessage[]): ChatMessage[] {
  // Drop any system messages from history — system is owned by buildSystemPrompt.
  const cleaned = history.filter((m) => m.role !== 'system')
  const maxMessages = readMaxTurns() * 2
  if (cleaned.length <= maxMessages) return cleaned
  return cleaned.slice(cleaned.length - maxMessages)
}

export function buildMessages(opts: BuildMessagesOpts): ChatMessage[] {
  const system: ChatMessage = {
    role: 'system',
    content: buildSystemPrompt({ locale: opts.locale, chunks: opts.systemContext }),
  }
  const history = truncateHistory(opts.history)
  const user: ChatMessage = { role: 'user', content: opts.userInput }
  return [system, ...history, user]
}
