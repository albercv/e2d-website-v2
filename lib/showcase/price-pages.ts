/**
 * Published reference-price pages. The Spanish-only pages link to them by name
 * and never restate a figure: the price lives in one place, the page itself.
 */
export interface PricePage {
  href: string
  name: string
}

export const AGENT_PRICE_PAGES: readonly PricePage[] = [
  { href: "/es/servicios/agente-ia-chatbot", name: "Agente de IA para chatbot (pack base)" },
  { href: "/es/servicios/agente-ia-integraciones", name: "Integraciones y acciones extra" },
  { href: "/es/servicios/dashboard-agente-ia", name: "Dashboard del agente de IA" },
]

export const CONSULTING_PRICE_PAGES: readonly PricePage[] = [
  { href: "/es/servicios/consultoria-proyecto-pequeno", name: "Consultoría: proyecto pequeño" },
  { href: "/es/servicios/consultoria-proyecto-mediano", name: "Consultoría: proyecto mediano" },
  { href: "/es/servicios/consultoria-proyecto-grande", name: "Consultoría: proyecto grande" },
]

export const ALL_PRICE_PAGES: readonly PricePage[] = [...AGENT_PRICE_PAGES, ...CONSULTING_PRICE_PAGES]
