import { PORTFOLIO_URL_BY_LOCALE } from "@/lib/seo/entities"

/**
 * Projects the Spanish-only pages may cite. Facts come from the verified fact
 * sheet of the 2026-10-20 audit; nothing here (results, metrics, client names
 * beyond these) may be extended without evidence.
 */

export type EvidenceKind = "client" | "own" | "demo" | "portfolio"

export interface ShowcaseProject {
  id: string
  name: string
  evidence: EvidenceKind
  /** Public site of the project; absent when the client has no public domain. */
  url?: string
  /** Domain shown as link text. */
  domain?: string
  /** Internal path of the post that tells the project, with its link text. */
  postPath?: string
  postLinkText?: string
  summary: string
}

export const FERDY_POST_PATH = "/es/blog/de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy"
export const MCP_BLOG_POST_PATH =
  "/es/blog/llevo-meses-sin-abrir-el-editor-de-mi-blog-publico-hablando-con-claude"
export const SKILLS_DEMO_POST_PATH = "/es/blog/automatizaciones-para-empresas-con-ia-dos-casos-reales"
export const LEGAL_NOTICE_PATH = "/es/legal"
export const CONTACT_HREF = "/es#contact"
export const CONTACT_EMAIL = "hello@evolve2digital.com"

export const FERDY: ShowcaseProject = {
  id: "ferdy",
  name: "Ferdy · Coach del desamor",
  evidence: "client",
  url: "https://ferdycoachdesamor.com",
  domain: "ferdycoachdesamor.com",
  postPath: FERDY_POST_PATH,
  postLinkText: "Leer el caso",
  summary:
    "Web a medida con páginas de programas, reserva y pago con Stripe, venta y entrega automática de ebooks, emails transaccionales automáticos y edición de contenidos sin programador.",
}

export const AUGUST_COLLECTION: ShowcaseProject = {
  id: "august-collection",
  name: "August Collection",
  evidence: "client",
  url: "https://augustore.es",
  domain: "augustore.es",
  summary: "Tienda online (comercio electrónico).",
}

export const ABY_FOODS: ShowcaseProject = {
  id: "aby-foods",
  name: "Åby Foods",
  evidence: "client",
  url: "https://abyfoods.fi",
  domain: "abyfoods.fi",
  summary: "Web corporativa.",
}

export const WHATSAPP_DASHBOARD: ShowcaseProject = {
  id: "whatsapp-dashboard",
  name: "Dashboard para un bot de WhatsApp",
  evidence: "client",
  summary:
    "Panel con estadísticas y visor de conversaciones. El cliente no tiene dominio público, por eso no hay enlace.",
}

export const ARCHETYPEX: ShowcaseProject = {
  id: "archetypex",
  name: "ArchetypeX",
  evidence: "portfolio",
  url: "https://archetypex.es",
  domain: "archetypex.es",
  summary: "Proyecto incluido en mi portfolio.",
}

export const CASA_VILLACASTIN: ShowcaseProject = {
  id: "casa-villacastin",
  name: "Casa de Villacastín",
  evidence: "portfolio",
  url: "https://e2dprojects.com/villacastin/",
  domain: "e2dprojects.com/villacastin",
  summary: "Proyecto incluido en mi portfolio.",
}

export const OWN_BLOG_PUBLISHING: ShowcaseProject = {
  id: "blog-from-claude",
  name: "Este blog, publicado desde Claude",
  evidence: "own",
  postPath: MCP_BLOG_POST_PATH,
  postLinkText: "Leer cómo lo hago",
  summary:
    "Los artículos de este blog se publican desde Claude mediante un conector MCP que he construido yo.",
}

export const OWN_SITE_ASSISTANT: ShowcaseProject = {
  id: "site-assistant",
  name: "El asistente de este sitio",
  evidence: "own",
  summary: "Un asistente que responde a las preguntas de los visitantes a partir del contenido del blog.",
}

export const OWN_PORTFOLIO: ShowcaseProject = {
  id: "e2dprojects",
  name: "e2dProjects, mi portfolio",
  evidence: "own",
  url: PORTFOLIO_URL_BY_LOCALE.es,
  domain: "e2dprojects.com",
  summary: "El portfolio donde reúno los proyectos que he desarrollado.",
}

export const DELIVERED_PROJECTS: readonly ShowcaseProject[] = [
  FERDY,
  AUGUST_COLLECTION,
  ABY_FOODS,
  WHATSAPP_DASHBOARD,
  ARCHETYPEX,
  CASA_VILLACASTIN,
]
