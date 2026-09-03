/**
 * Builds the consultation email Alberto receives when a visitor leaves
 * their details through the chat panel form.
 *
 * Produces both an HTML body (single `<table>` skeleton, inline CSS, no
 * external assets) and a plaintext fallback (line-wrapped at 78 chars).
 * Locale only changes section labels; lead and conversation content is
 * preserved verbatim and escaped where appropriate.
 */

export interface ConsultationEmailLead {
  name?: string
  email: string
  phone?: string
  company?: string
  intent?: string
  message?: string
}

export interface ConsultationEmailTurn {
  role: "user" | "assistant"
  content: string
  createdAt: Date
}

export interface ConsultationEmailInput {
  lead: ConsultationEmailLead
  conversation: ConsultationEmailTurn[]
  locale: "es" | "en" | "it"
  // Absent for leads captured outside the chat (contact modal).
  sessionId?: string
}

export interface ConsultationEmail {
  subject: string
  html: string
  text: string
}

interface Labels {
  heading: string
  timestamp: string
  contactBox: string
  name: string
  email: string
  phone: string
  company: string
  intent: string
  message: string
  transcript: string
  noTranscript: string
  roleUser: string
  roleAssistant: string
  session: string
}

const LABELS: Record<"es" | "en" | "it", Labels> = {
  es: {
    heading: "Nueva consulta desde la web E2D",
    timestamp: "Recibido",
    contactBox: "Contacto",
    name: "Nombre",
    email: "Email",
    phone: "Teléfono",
    company: "Empresa",
    intent: "Tema",
    message: "Mensaje",
    transcript: "Conversación con el asistente",
    noTranscript: "(sin mensajes previos)",
    roleUser: "Visitante",
    roleAssistant: "Asistente",
    session: "Sesión",
  },
  en: {
    heading: "New enquiry from the E2D website",
    timestamp: "Received",
    contactBox: "Contact",
    name: "Name",
    email: "Email",
    phone: "Phone",
    company: "Company",
    intent: "Topic",
    message: "Message",
    transcript: "Conversation with the assistant",
    noTranscript: "(no prior messages)",
    roleUser: "Visitor",
    roleAssistant: "Assistant",
    session: "Session",
  },
  it: {
    heading: "Nuova richiesta dal sito E2D",
    timestamp: "Ricevuto",
    contactBox: "Contatto",
    name: "Nome",
    email: "Email",
    phone: "Telefono",
    company: "Azienda",
    intent: "Argomento",
    message: "Messaggio",
    transcript: "Conversazione con l'assistente",
    noTranscript: "(nessun messaggio precedente)",
    roleUser: "Visitatore",
    roleAssistant: "Assistente",
    session: "Sessione",
  },
}

const MAX_TRANSCRIPT_TURNS = 20
const TEXT_WRAP_COLS = 78

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildSubject(lead: ConsultationEmailLead): string {
  const who = lead.name && lead.name.trim().length > 0 ? lead.name : lead.email
  const intentSuffix = lead.intent ? ` (${lead.intent})` : ""
  return `[E2D web] Nueva consulta — ${who}${intentSuffix}`
}

function renderContactRow(label: string, value: string): string {
  return (
    `<tr><td style="padding:4px 8px;color:#555;font-size:12px;">${escapeHtml(label)}</td>` +
    `<td style="padding:4px 8px;font-size:14px;">${value}</td></tr>`
  )
}

function renderContactBox(lead: ConsultationEmailLead, labels: Labels): string {
  const rows: string[] = []
  if (lead.name) rows.push(renderContactRow(labels.name, escapeHtml(lead.name)))
  rows.push(
    renderContactRow(
      labels.email,
      `<a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>`,
    ),
  )
  if (lead.phone) {
    const cleaned = lead.phone.replace(/[^\d+]/g, "")
    rows.push(
      renderContactRow(
        labels.phone,
        `<a href="tel:${escapeHtml(cleaned)}">${escapeHtml(lead.phone)}</a>`,
      ),
    )
  }
  if (lead.company) rows.push(renderContactRow(labels.company, escapeHtml(lead.company)))
  if (lead.intent) rows.push(renderContactRow(labels.intent, escapeHtml(lead.intent)))
  return (
    `<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #eee;border-radius:6px;margin:12px 0;">` +
    `<tr><td colspan="2" style="background:#05b4ba;color:#fff;padding:8px 12px;font-weight:600;font-size:13px;">${escapeHtml(labels.contactBox)}</td></tr>` +
    rows.join("") +
    `</table>`
  )
}

function renderMessageBlock(message: string, labels: Labels): string {
  return (
    `<div style="margin:12px 0;padding:12px;background:#f7f7f7;border-left:3px solid #05b4ba;">` +
    `<div style="font-size:12px;color:#555;margin-bottom:6px;">${escapeHtml(labels.message)}</div>` +
    `<div style="font-size:14px;white-space:pre-wrap;">${escapeHtml(message)}</div>` +
    `</div>`
  )
}

function renderTranscript(
  conversation: ConsultationEmailTurn[],
  labels: Labels,
): string {
  const turns = conversation.slice(-MAX_TRANSCRIPT_TURNS)
  if (turns.length === 0) {
    return (
      `<div style="margin:12px 0;font-size:13px;color:#777;">${escapeHtml(labels.noTranscript)}</div>`
    )
  }
  const rows = turns
    .map((t) => {
      const roleLabel = t.role === "user" ? labels.roleUser : labels.roleAssistant
      const bg = t.role === "user" ? "#eef9fa" : "#fafafa"
      return (
        `<div style="margin:6px 0;padding:8px 10px;background:${bg};border-radius:4px;">` +
        `<div style="font-size:11px;color:#666;margin-bottom:2px;">${escapeHtml(roleLabel)}</div>` +
        `<div style="font-size:13px;white-space:pre-wrap;">${escapeHtml(t.content)}</div>` +
        `</div>`
      )
    })
    .join("")
  return (
    `<div style="margin:16px 0;">` +
    `<div style="font-size:13px;font-weight:600;margin-bottom:8px;">${escapeHtml(labels.transcript)}</div>` +
    rows +
    `</div>`
  )
}

function buildHtml(input: ConsultationEmailInput, labels: Labels): string {
  const receivedAt = new Date().toISOString()
  return (
    `<table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;margin:0 auto;font-family:Helvetica,Arial,sans-serif;color:#111;">` +
    `<tr><td style="padding:16px 0;border-bottom:2px solid #05b4ba;">` +
    `<div style="font-size:18px;font-weight:700;">${escapeHtml(labels.heading)}</div>` +
    `<div style="font-size:12px;color:#777;">${escapeHtml(labels.timestamp)}: ${escapeHtml(receivedAt)}</div>` +
    `</td></tr>` +
    `<tr><td>${renderContactBox(input.lead, labels)}</td></tr>` +
    (input.lead.message
      ? `<tr><td>${renderMessageBlock(input.lead.message, labels)}</td></tr>`
      : "") +
    `<tr><td>${renderTranscript(input.conversation, labels)}</td></tr>` +
    (input.sessionId
      ? `<tr><td style="padding-top:12px;border-top:1px solid #eee;">` +
        `<div style="font-family:monospace;font-size:11px;color:#999;">${escapeHtml(labels.session)}: ${escapeHtml(input.sessionId)}</div>` +
        `</td></tr>`
      : "") +
    `</table>`
  )
}

function wrapLine(line: string, cols: number): string {
  if (line.length <= cols) return line
  const out: string[] = []
  let remaining = line
  while (remaining.length > cols) {
    // Try to break at the last whitespace within `cols`; fall back to a hard break.
    let breakAt = remaining.lastIndexOf(" ", cols)
    if (breakAt <= 0) breakAt = cols
    out.push(remaining.slice(0, breakAt))
    remaining = remaining.slice(breakAt).trimStart()
  }
  out.push(remaining)
  return out.join("\n")
}

function wrapText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => wrapLine(line, TEXT_WRAP_COLS))
    .join("\n")
}

function buildText(input: ConsultationEmailInput, labels: Labels): string {
  const lead = input.lead
  const lines: string[] = []
  lines.push(labels.heading)
  lines.push(`${labels.timestamp}: ${new Date().toISOString()}`)
  lines.push("")
  lines.push(`-- ${labels.contactBox} --`)
  if (lead.name) lines.push(`${labels.name}: ${lead.name}`)
  lines.push(`${labels.email}: ${lead.email}`)
  if (lead.phone) lines.push(`${labels.phone}: ${lead.phone}`)
  if (lead.company) lines.push(`${labels.company}: ${lead.company}`)
  if (lead.intent) lines.push(`${labels.intent}: ${lead.intent}`)
  if (lead.message) {
    lines.push("")
    lines.push(`-- ${labels.message} --`)
    lines.push(lead.message)
  }
  lines.push("")
  lines.push(`-- ${labels.transcript} --`)
  const turns = input.conversation.slice(-MAX_TRANSCRIPT_TURNS)
  if (turns.length === 0) {
    lines.push(labels.noTranscript)
  } else {
    for (const t of turns) {
      const who = t.role === "user" ? labels.roleUser : labels.roleAssistant
      lines.push(`[${who}] ${t.content}`)
    }
  }
  if (input.sessionId) {
    lines.push("")
    lines.push(`${labels.session}: ${input.sessionId}`)
  }
  return wrapText(lines.join("\n"))
}

export function buildConsultationEmail(
  input: ConsultationEmailInput,
): ConsultationEmail {
  const labels = LABELS[input.locale]
  return {
    subject: buildSubject(input.lead),
    html: buildHtml(input, labels),
    text: buildText(input, labels),
  }
}
