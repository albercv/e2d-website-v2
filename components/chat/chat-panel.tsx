"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { KeyboardEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import { MessageCircle, RotateCcw, Send, X } from "lucide-react"
import { ChatMessage } from "./chat-message"
import { useChatStream, type ChatTurn, type ChatError } from "./use-chat-stream"
import { cn } from "@/lib/utils"

// Mirrors the existing contact-modal contract. Kept inline (single source) to
// avoid coupling this component to contact-modal.tsx — wire-up to share will be
// done in the follow-up task that replaces FloatingContactButton.
const WHATSAPP_NUMBER_INTL = "34605497639"
const SUPPORT_EMAIL = "hello@evolve2digital.com"

function buildWhatsappHref(): string {
  const text = "Hola Alberto, vengo de tu web y me gustaría hablar sobre un proyecto."
  return `https://wa.me/${WHATSAPP_NUMBER_INTL}?text=${encodeURIComponent(text)}`
}

function buildMailHref(): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Consulta desde la web E2D")}`
}

interface PanelHeaderProps {
  title: string
  subtitle: string
  closeLabel: string
  resetLabel: string
  onClose: () => void
  onReset: () => void
}

function PanelHeader(props: PanelHeaderProps): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-2 border-b bg-[#05b4ba] px-4 py-3 text-white">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold">{props.title}</h2>
        <p className="truncate text-xs text-white/80">{props.subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={props.onReset}
          aria-label={props.resetLabel}
          title={props.resetLabel}
          className="rounded-full p-1.5 text-white/90 transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={props.onClose}
          aria-label={props.closeLabel}
          title={props.closeLabel}
          className="rounded-full p-1.5 text-white/90 transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

interface MessageListProps {
  messages: ChatTurn[]
  initialMessage: string
}

function MessageList(props: MessageListProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [props.messages])

  const renderInitial = props.messages.length === 0
  return (
    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
      {renderInitial ? (
        <ChatMessage role="assistant" content={props.initialMessage} />
      ) : (
        props.messages.map((m) => (
          <ChatMessage key={m.id} role={m.role} content={m.content} pending={m.pending} />
        ))
      )}
    </div>
  )
}

interface ErrorBlockProps {
  error: ChatError
  errorGeneric: string
  errorRateLimit: string
  fallbackCTA: string
}

function ErrorBlock(props: ErrorBlockProps): JSX.Element | null {
  if (props.error === null) return null
  const isRateLimit = props.error === "rate-limit"
  const text = isRateLimit ? props.errorRateLimit : props.errorGeneric
  return (
    <div
      role="alert"
      className="space-y-2 border-t border-destructive/30 bg-destructive/5 px-4 py-2 text-xs text-destructive"
    >
      <p>{text}</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={buildWhatsappHref()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-[#25D366] px-2 py-1 text-white hover:bg-[#25D366]/90"
        >
          {props.fallbackCTA}
        </a>
        <a
          href={buildMailHref()}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-foreground hover:bg-accent"
        >
          {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  )
}

interface InputBarProps {
  placeholder: string
  sendLabel: string
  disabled: boolean
  onSubmit: (text: string) => void
}

function InputBar(props: InputBarProps): JSX.Element {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const submit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || props.disabled) return
    props.onSubmit(trimmed)
    setValue("")
    // Re-focus so the user can keep typing without picking up the mouse.
    textareaRef.current?.focus()
  }, [props, value])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex items-end gap-2 border-t bg-background px-3 py-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={props.placeholder}
        rows={1}
        data-chat-input
        className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#05b4ba] disabled:opacity-50"
        disabled={props.disabled}
      />
      <button
        type="button"
        onClick={submit}
        disabled={props.disabled || value.trim() === ""}
        aria-label={props.sendLabel}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#05b4ba] text-white",
          "transition-opacity hover:bg-[#05b4ba]/90 disabled:opacity-40",
        )}
      >
        <Send className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

interface LauncherProps {
  label: string
  onClick: () => void
}

function Launcher(props: LauncherProps): JSX.Element {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        type="button"
        onClick={props.onClick}
        aria-label={props.label}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#05b4ba] text-white shadow-lg transition-all duration-300 hover:bg-[#05b4ba]/90 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#05b4ba]"
      >
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[#05b4ba] opacity-20 motion-safe:animate-ping" />
      </button>
    </div>
  )
}

export function ChatPanel(): JSX.Element {
  const t = useTranslations("chat")
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const stream = useChatStream({ locale })

  // ESC closes and focus moves to the textarea on open. We rely on a data
  // attribute selector to avoid threading another ref through child components.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === "Escape") setIsOpen(false)
    }
    window.addEventListener("keydown", onKey)
    const ta = panelRef.current?.querySelector<HTMLTextAreaElement>("[data-chat-input]")
    ta?.focus()
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen])

  const close = useCallback(() => setIsOpen(false), [])
  const open = useCallback(() => setIsOpen(true), [])

  if (!isOpen) return <Launcher label={t("openLabel")} onClick={open} />

  return (
    <>
      <Launcher label={t("openLabel")} onClick={open} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        className={cn(
          "fixed z-50 flex flex-col bg-background shadow-2xl",
          // Mobile: full-screen overlay. Desktop: anchored bottom-right panel.
          "inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[560px] sm:w-[380px] sm:rounded-2xl sm:border",
          "overflow-hidden",
        )}
      >
        <PanelHeader
          title={t("title")}
          subtitle={t("subtitle")}
          closeLabel={t("close")}
          resetLabel={t("newConversation")}
          onClose={close}
          onReset={stream.reset}
        />
        <MessageList messages={stream.messages} initialMessage={t("initialMessage")} />
        <ErrorBlock
          error={stream.error}
          errorGeneric={t("errorGeneric")}
          errorRateLimit={t("errorRateLimit")}
          fallbackCTA={t("fallbackContactCTA")}
        />
        <InputBar
          placeholder={t("placeholder")}
          sendLabel={t("send")}
          disabled={stream.isStreaming}
          onSubmit={(text) => {
            void stream.send(text)
          }}
        />
        <p className="border-t bg-muted/40 px-4 py-2 text-[10px] leading-tight text-muted-foreground">
          {t("disclaimer")}
        </p>
      </div>
    </>
  )
}
