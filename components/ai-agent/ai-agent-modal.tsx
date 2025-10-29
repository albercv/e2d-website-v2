"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useTranslations, useLocale } from "next-intl"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Send, ExternalLink, Mic, MicOff, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface AIAgentModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ChatMessage {
  id: string
  type: "user" | "agent"
  content: string
  timestamp: Date
}

const commonIntentions = {
  es: [
    "Automatización para mi negocio",
    "WhatsApp bot personalizado",
    "Agente de voz inteligente",
    "Desarrollo web moderno",
    "Integración con sistemas",
    "Presupuesto personalizado",
  ],
  en: [
    "Business automation",
    "Custom WhatsApp bot",
    "Intelligent voice agent",
    "Modern web development",
    "System integration",
    "Custom quote",
  ],
}

export function AIAgentModal({ isOpen, onClose }: AIAgentModalProps) {
  const t = useTranslations("agent")
  const locale = useLocale()
  const [activeTab, setActiveTab] = useState("chat")
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [consent, setConsent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      setSpeechSupported(true)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()

      if (recognitionRef.current) {
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = locale === "es" ? "es-ES" : "en-US"

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript
          setMessage(transcript)
          setIsListening(false)
        }

        recognitionRef.current.onerror = () => {
          setIsListening(false)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      }
    }
  }, [locale])

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  // Track modal open event
  useEffect(() => {
    if (isOpen && typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "agent_open", {
        event_category: "engagement",
        event_label: locale,
      })
    }
  }, [isOpen, locale])

  const handleVoiceToggle = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const handleIntentionClick = (intention: string) => {
    setMessage(intention)
    // Add to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: intention,
      timestamp: new Date(),
    }
    setChatMessages((prev) => [...prev, userMessage])

    // Simulate agent response
    setTimeout(() => {
      const agentResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: getAgentResponse(intention, locale),
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, agentResponse])
    }, 1000)

    // Track message event
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "agent_message", {
        event_category: "engagement",
        event_label: intention,
        value: 1,
      })
    }
  }

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: message,
      timestamp: new Date(),
    }
    setChatMessages((prev) => [...prev, userMessage])

    // Simulate agent response
    setTimeout(() => {
      const agentResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: getAgentResponse(message, locale),
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, agentResponse])
    }, 1000)

    setMessage("")

    // Track message event
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "agent_message", {
        event_category: "engagement",
        event_label: "custom_message",
        value: 1,
      })
    }
  }

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consent || (!email && !phone)) return

    setIsSubmitting(true)

    try {
      // FAKE API call as specified
      const response = await fetch("https://api.evolve2digital.com/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chatMessages.length > 0 ? chatMessages.map((m) => `${m.type}: ${m.content}`).join("\n") : message,
          locale,
          consent,
          email: email || undefined,
          phone: phone || undefined,
          company: company || undefined,
          notes: `Enviado desde modal agente. Chat history: ${chatMessages.length} mensajes`,
        }),
      })

      // Track success/error
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", response.ok ? "lead_submit_success" : "lead_submit_error", {
          event_category: "conversion",
          event_label: locale,
          value: response.ok ? 1 : 0,
        })
      }

      // Success - close modal
      if (response.ok) {
        onClose()
      }
    } catch (error) {
      console.error("Error submitting lead:", error)

      // Track error
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "lead_submit_error", {
          event_category: "conversion",
          event_label: "network_error",
          value: 0,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWhatsAppHandoff = () => {
    const chatHistory =
      chatMessages.length > 0
        ? chatMessages.map((m) => `${m.type === "user" ? "Yo" : "Asistente"}: ${m.content}`).join("\n")
        : message

    const whatsappMessage = encodeURIComponent(
      `Hola, me interesa conocer más sobre los servicios de automatización de E2D.\n\n${chatHistory ? `Conversación previa:\n${chatHistory}` : ""}`,
    )

    window.open(`https://wa.me/34600000000?text=${whatsappMessage}`, "_blank")

    // Track handoff event
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "handoff_whatsapp", {
        event_category: "engagement",
        event_label: locale,
        value: 1,
      })
    }
  }

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEsc)
      return () => document.removeEventListener("keydown", handleEsc)
    }
  }, [isOpen, onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-modal-title"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-lg max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="bg-card border-border h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 flex-shrink-0">
            <CardTitle id="agent-modal-title" className="text-lg font-semibold text-foreground">
              {t("title")}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cerrar modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="contact">Contacto</TabsTrigger>
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="space-y-4 mt-4 flex-1 flex flex-col overflow-hidden">
                {/* Common Intentions */}
                <div className="flex-shrink-0">
                  <h4 className="text-sm font-medium text-foreground mb-3">Consultas frecuentes:</h4>
                  <div className="flex flex-wrap gap-2">
                    {commonIntentions[locale as keyof typeof commonIntentions].map((intention) => (
                      <Badge
                        key={intention}
                        variant="outline"
                        className="cursor-pointer hover:bg-[#05b4ba]/10 hover:border-[#05b4ba] transition-colors"
                        onClick={() => handleIntentionClick(intention)}
                      >
                        {intention}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Haz clic en una consulta frecuente o escribe tu pregunta</p>
                    </div>
                  )}

                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.type === "user" ? "bg-[#05b4ba] text-white" : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <form onSubmit={handleChatSubmit} className="flex gap-2 flex-shrink-0">
                  <div className="flex-1 relative">
                    <Textarea
                      placeholder={t("placeholder")}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[40px] max-h-[120px] resize-none pr-12"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleChatSubmit(e)
                        }
                      }}
                    />
                    {speechSupported && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleVoiceToggle}
                        className={`absolute right-2 top-2 h-6 w-6 p-0 ${
                          isListening ? "text-red-500" : "text-muted-foreground"
                        }`}
                        aria-label={isListening ? "Parar grabación" : "Iniciar grabación de voz"}
                      >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!message.trim()}
                    className="bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 mt-4 overflow-y-auto">
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        type="email"
                        placeholder={t("email")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-label="Email"
                      />
                    </div>
                    <div>
                      <Input
                        type="tel"
                        placeholder={t("phone")}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        aria-label="Teléfono"
                      />
                    </div>
                  </div>

                  <div>
                    <Input
                      placeholder={t("company")}
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      aria-label="Empresa"
                    />
                  </div>

                  <div>
                    <Textarea
                      placeholder="Describe tu proyecto o necesidad..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[100px] resize-none"
                      aria-label="Mensaje"
                    />
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="consent"
                      checked={consent}
                      onCheckedChange={(checked) => setConsent(checked as boolean)}
                      className="mt-1"
                    />
                    <label htmlFor="consent" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                      {t("consent")}{" "}
                      <a href="/privacy" className="text-[#05b4ba] hover:underline">
                        política de privacidad
                      </a>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white"
                    disabled={!consent || (!email && !phone) || isSubmitting}
                  >
                    {isSubmitting ? "Enviando..." : t("submit")}
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="whatsapp" className="space-y-4 mt-4 text-center overflow-y-auto">
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Continúa la conversación directamente en WhatsApp para una respuesta más rápida
                  </div>

                  {chatMessages.length > 0 && (
                    <div className="bg-muted/50 p-3 rounded-lg text-left">
                      <p className="text-sm font-medium mb-2">Resumen de la conversación:</p>
                      <div className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                        {chatMessages.slice(-3).map((msg) => (
                          <div key={msg.id}>
                            <strong>{msg.type === "user" ? "Tú" : "Asistente"}:</strong> {msg.content}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Textarea
                      placeholder="Mensaje adicional (opcional)"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  <Button
                    onClick={handleWhatsAppHandoff}
                    className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                  >
                    {t("handoff")}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

// Helper function to generate agent responses
function getAgentResponse(userMessage: string, locale: string): string {
  const responses = {
    es: {
      voicebot:
        "¡Excelente! Los agentes de voz pueden aumentar la eficiencia de tu negocio hasta un 35%. Te ayudo a implementar una solución personalizada. ¿Qué tipo de negocio tienes?",
      whatsapp:
        "Los bots de WhatsApp pueden reducir la carga de trabajo hasta un 28% y mejorar la atención al cliente. ¿Cuántas consultas recibes mensualmente?",
      automatizacion:
        "La automatización puede ahorrarte hasta 12 horas semanales. ¿Qué procesos repetitivos tienes actualmente en tu negocio?",
      web: "Desarrollo sitios web modernos optimizados para SEO y conversión. ¿Necesitas una web nueva o mejorar la actual?",
      crm: "Un sistema personalizado puede aumentar tus ventas un 20%. ¿Cómo gestionas actualmente tus clientes y leads?",
      presupuesto:
        "Perfecto, puedo prepararte un presupuesto personalizado. ¿Podrías contarme más sobre tu proyecto específico?",
      default:
        "Gracias por tu consulta. Soy especialista en automatización empresarial. ¿Podrías contarme más sobre tu negocio y qué procesos te gustaría automatizar?",
    },
    en: {
      voicebot:
        "Excellent! Voice agents can increase your business efficiency by up to 35%. I'll help you implement a custom solution. What type of business do you have?",
      whatsapp:
        "WhatsApp bots can reduce workload by up to 28% and improve customer service. How many inquiries do you receive monthly?",
      automatizacion:
        "Automation can save you up to 12 hours weekly. What repetitive processes do you currently have in your business?",
      web: "I develop modern websites optimized for SEO and conversion. Do you need a new website or improve the current one?",
      crm: "A custom system can increase your sales by 20%. How do you currently manage your customers and leads?",
      presupuesto: "Perfect, I can prepare a personalized quote. Could you tell me more about your specific project?",
      default:
        "Thanks for your inquiry. I specialize in business automation. Could you tell me more about your business and what processes you'd like to automate?",
    },
  }

  const localeResponses = responses[locale as keyof typeof responses] || responses.es
  const message = userMessage.toLowerCase()

  if (message.includes("voicebot") || message.includes("voz") || message.includes("voice") || message.includes("agente")) {
    return localeResponses.voicebot
  }
  if (message.includes("whatsapp") || message.includes("bot") || message.includes("chat")) {
    return localeResponses.whatsapp
  }
  if (message.includes("automatización") || message.includes("automation") || message.includes("proceso")) {
    return localeResponses.automatizacion
  }
  if (message.includes("web") || message.includes("desarrollo") || message.includes("development")) {
    return localeResponses.web
  }
  if (message.includes("crm") || message.includes("sistema") || message.includes("integración")) {
    return localeResponses.crm
  }
  if (message.includes("presupuesto") || message.includes("quote") || message.includes("precio")) {
    return localeResponses.presupuesto
  }

  return localeResponses.default
}

// Extend Window interface for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
    gtag: any
  }
}
