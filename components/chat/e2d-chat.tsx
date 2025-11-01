"use client"

import { useEffect } from "react"
import { useLocale } from "next-intl"
import { createChat } from "@n8n/chat"
import "@n8n/chat/style.css"

/**
 * E2D Chat widget using @n8n/chat
 * - Renders a floating chat toggle in the bottom-right corner
 * - Uses a Next.js API proxy (/api/chat) to avoid exposing credentials client-side
 * - Persists a stable UUID in localStorage and uses it as sessionId for all chat requests
 */
export function E2DChat() {
  const locale = useLocale()

  useEffect(() => {
    // Ensure a stable user/session UUID persisted in localStorage
    const USER_UUID_KEY = "e2d_user_uuid"
    const CHAT_SESSION_KEY = "sessionId" // @n8n/chat default field name

    const generateUUID = () => {
      if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
        return (crypto as any).randomUUID()
      }
      // Fallback RFC4122-ish UUID v4
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === "x" ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    }

    try {
      const stored = window.localStorage.getItem(USER_UUID_KEY)
      const uuid = stored || generateUUID()
      if (!stored) {
        window.localStorage.setItem(USER_UUID_KEY, uuid)
      }
      // Ensure the widget will send our UUID as sessionId
      window.localStorage.setItem(CHAT_SESSION_KEY, uuid)
      // Optional: expose for quick manual verification in console
      ;(window as any).__E2D_CHAT_SESSION_ID__ = uuid
    } catch {
      // Ignore storage errors (Safari private mode, etc.)
    }

    // Initialize chat once on mount (and when locale changes)
    const chat = createChat({
      webhookUrl: "/api/chat",
      webhookConfig: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
      target: "#n8n-chat",
      mode: "window",
      chatSessionKey: "sessionId", // keep default to match our proxy expectations
      loadPreviousSession: false,
      metadata: { locale },
      defaultLanguage: "en",
      initialMessages: [
        locale === "es"
          ? "¡Hola! Soy el asistente de E2D. ¿En qué puedo ayudarte?"
          : locale === "it"
          ? "Ciao! Sono l'assistente di E2D. Come posso aiutarti?"
          : "Hi! I'm the E2D assistant. How can I help you?",
      ],
      i18n: {
        en: {
          title: locale === "es" ? "¡Hola! 👋" : locale === "it" ? "Ciao! 👋" : "Hi there! 👋",
          subtitle:
            locale === "es"
              ? "Inicia una conversación. Estamos aquí para ayudarte."
              : locale === "it"
              ? "Inizia una chat. Siamo qui per aiutarti."
              : "Start a chat. We're here to help.",
          footer: "",
          getStarted: locale === "es" ? "Nueva conversación" : locale === "it" ? "Nuova conversazione" : "New Conversation",
          inputPlaceholder: locale === "es" ? "Escribe tu pregunta..." : locale === "it" ? "Scrivi la tua domanda..." : "Type your question...",
          closeButtonTooltip: locale === "es" ? "Cerrar" : locale === "it" ? "Chiudi" : "Close",
        },
      },
      enableStreaming: false,
    })

    return () => {
      // Best effort cleanup (widget doesn't expose a destroy method)
      // We can remove the container's innerHTML to avoid duplicates on hot reloads
      const container = document.querySelector("#n8n-chat") as HTMLElement | null
      if (container) container.innerHTML = ""
    }
  }, [locale])

  return (
    <>
      <style jsx global>{`
        /* Position container */
        #n8n-chat {
          position: fixed;
          bottom: 1.5rem; /* 24px */
          right: 1.5rem; /* 24px */
          z-index: 50;
          /* Ensure n8n widget uses our brand primary */
          --color--primary: #05b4ba; /* E2D brand */
          /* Optional: complementary accent (coral). Uncomment to use */
          /* --color--secondary: #ff7a59; */
        }
        /* Target the actual launcher button rendered by the widget */
        #n8n-chat .chat-button,
        #n8n-chat button.chat-button {
          background-color: var(--color--primary) !important; /* brand primary */
          color: #ffffff !important;
          border-radius: 9999px !important; /* full rounded */
          width: 56px !important;
          height: 56px !important;
          box-shadow: 0 10px 15px -3px rgba(5, 180, 186, 0.3), 0 4px 6px -4px rgba(5, 180, 186, 0.3) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          backdrop-filter: saturate(120%);
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        #n8n-chat .chat-button:hover,
        #n8n-chat button.chat-button:hover {
          filter: brightness(0.95);
          transform: translateY(-1px);
          box-shadow: 0 15px 25px -5px rgba(5, 180, 186, 0.35), 0 10px 10px -5px rgba(5, 180, 186, 0.25) !important;
        }
        #n8n-chat .chat-button:active,
        #n8n-chat button.chat-button:active {
          transform: translateY(0);
          filter: brightness(0.9);
        }

        /* Widget window theming to match brand */
        #n8n-chat .chat-window {
          border-radius: 16px !important;
          overflow: hidden;
        }
        #n8n-chat .chat-header {
          background-color: var(--color--primary) !important;
          color: #ffffff !important;
        }
        #n8n-chat .chat-header svg {
          color: #ffffff !important;
        }
        #n8n-chat .chat-input-send-button {
          background-color: var(--color--secondary, var(--color--primary)) !important;
          color: #ffffff !important;
          border-radius: 9999px !important;
        }
        #n8n-chat .chat-input-send-button:hover {
          filter: brightness(0.95);
        }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          #n8n-chat .chat-button,
          #n8n-chat button.chat-button,
          #n8n-chat .chat-input-send-button {
            transition: none;
          }
        }
      `}</style>
      <div id="n8n-chat" />
    </>
  )
}