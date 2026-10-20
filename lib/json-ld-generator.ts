/**
 * Advanced JSON-LD Generator for AI Comprehension
 * Generates Schema.org compliant structured data for optimal AI understanding
 * 
 * Features:
 * - Dynamic schema generation from content metadata
 * - Multi-language support (ES/EN)
 * - AI-optimized semantic relationships
 * - Schema.org validation compliance
 * - SSG compatibility with Next.js
 */

import type { RuntimePost as Post } from "@/lib/blog/posts-runtime"
import { postModifiedDate } from "@/lib/blog/post-dates"
import {
  AREA_SERVED,
  CONTACT_ANCHOR,
  ORGANIZATION_ID,
  PERSON_ID,
  PERSON_NAME,
  PERSON_PROFILE_URL,
  PERSON_SAME_AS,
  SITE_URL,
  WEBSITE_ID,
  organizationRef,
  personRef,
} from "@/lib/seo/entities"

export type JsonLdNode = Record<string, unknown>

export interface JsonLdConfig {
  baseUrl: string
  defaultLocale: string
  supportedLocales: string[]
  organization: OrganizationData
  author: PersonData
}

export interface OrganizationData {
  name: string
  alternateName: string
  description: { [locale: string]: string }
  logo: string
  url: string
  email: string
  telephone?: string
  address: {
    country: string
    locality: string
  }
  services: { [locale: string]: string[] }
  areaServed: readonly string[]
}

export interface PersonData {
  name: string
  jobTitle: { [locale: string]: string }
  description: { [locale: string]: string }
  url: string
  email: string
  sameAs: readonly string[]
  worksFor: string
  expertise: { [locale: string]: string[] }
}

export interface BlogPostData {
  title: string
  description: string
  author: string
  datePublished: string
  dateModified?: string
  url: string
  image?: string
  locale: string
  tags?: string[]
  wordCount?: number
  readingTime?: any
  category?: string
}

const LANGUAGE_NAMES: Record<string, string> = { es: "Spanish", en: "English", it: "Italian" }

// Home country of the business, shared by the occupation and the audience.
const spain = (): JsonLdNode => ({ "@type": "Country", name: "Spain" })

export class JsonLdGenerator {
  private config: JsonLdConfig

  constructor(config: JsonLdConfig) {
    this.config = config
  }

  /**
   * Generate the whole site identity as one @graph. A single script means the
   * entities cannot drift apart (the audit found two Organization ids and a
   * WebSite described differently by two emitters); nodes reference each other
   * through @id only.
   */
  generateSiteGraph(locale: string): { "@context": string; "@graph": JsonLdNode[] } {
    return {
      "@context": "https://schema.org",
      "@graph": [
        this.organizationNode(locale),
        this.personNode(locale),
        this.websiteNode(locale),
        this.serviceNode(locale),
      ],
    }
  }

  /**
   * Generate Organization schema with AI-optimized metadata
   */
  generateOrganizationSchema(locale: string): object {
    return this.withContext(this.organizationNode(locale))
  }

  /**
   * Generate Person schema for author with enhanced AI context
   */
  generatePersonSchema(locale: string): object {
    return this.withContext(this.personNode(locale))
  }

  /**
   * Generate Website schema with comprehensive metadata
   */
  generateWebsiteSchema(locale: string): object {
    return this.withContext(this.websiteNode(locale))
  }

  /**
   * Generate Service schema for business offerings
   */
  generateServiceSchema(locale: string): object {
    return this.withContext(this.serviceNode(locale))
  }

  /**
   * Generate BlogPosting schema with AI-optimized metadata
   */
  generateBlogPostSchema(post: BlogPostData): object {
    const baseUrl = this.config.baseUrl
    // post.url puede llegar como ruta relativa (`/es/blog/...`) o ya absoluta
    // (`https://.../es/blog/...`). Concatenar baseUrl sin comprobarlo duplicaba
    // el origen (`evolve2digital.comhttps://evolve2digital.com/...`), rompiendo
    // @id/url/mainEntityOfPage en TODOS los posts para rich results y para IA.
    const fullUrl = /^https?:\/\//.test(post.url) ? post.url : `${baseUrl}${post.url}`
    
    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": fullUrl,
      headline: post.title,
      description: post.description,
      author: this.blogAuthorNode(post.author),
      publisher: this.blogPublisherNode(),
      datePublished: post.datePublished,
      dateModified: post.dateModified || post.datePublished,
      url: fullUrl,
      image: post.image ? `${baseUrl}${post.image}` : `${baseUrl}/og-image.png`,
      inLanguage: post.locale === "es" ? "es-ES" : "en-US",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": fullUrl
      },
      isPartOf: {
        "@type": "Blog",
        "@id": `${baseUrl}/${post.locale}/blog`,
        name: post.locale === "es" ? "Blog E2D" : "E2D Blog"
      },
      ...this.blogContentNodes(post),
      // Enhanced semantic context
      potentialAction: {
        "@type": "ReadAction",
        target: fullUrl
      }
      // NOTA: se eliminó `aggregateRating` (valoración fabricada 4.8/1 voto).
      // Datos estructurados inventados = riesgo de manual action de Google y
      // AggregateRating no genera rich result en artículos. Solo riesgo.
    }
  }

  // Topic, keywords and size hints for AI readers, derived from the post itself.
  private blogContentNodes(post: BlogPostData): JsonLdNode {
    return {
      articleSection: post.category || (post.locale === "es" ? "Automatización" : "Automation"),
      keywords: post.tags || [
        "automatización", "chatbots", "WhatsApp", "voicebots", "PYME",
        "desarrollo web", "React", "Next.js", "n8n", "IA"
      ],
      wordCount: post.wordCount,
      timeRequired: post.readingTime ? `PT${Math.ceil(post.readingTime.minutes)}M` : "PT5M",
      about: {
        "@type": "Thing",
        name: post.locale === "es" ? "Automatización Empresarial" : "Business Automation"
      },
      mentions: post.tags?.map(tag => ({
        "@type": "Thing",
        name: tag
      })) || []
    }
  }

  /**
   * Only the site owner is attached to #person: pointing a guest author at the
   * owner's id would credit (and merge) another person's writing with his.
   */
  private blogAuthorNode(author: string): JsonLdNode {
    if (author.trim() !== PERSON_NAME) return { "@type": "Person", name: author }
    return { "@type": "Person", "@id": PERSON_ID, name: author, url: this.config.author.url }
  }

  private blogPublisherNode(): JsonLdNode {
    return {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: this.config.organization.name,
      logo: this.logoNode(),
    }
  }

  private withContext(node: JsonLdNode): JsonLdNode {
    return { "@context": "https://schema.org", ...node }
  }

  private pick<T>(byLocale: { [locale: string]: T }, locale: string): T {
    return byLocale[locale] || byLocale[this.config.defaultLocale]
  }

  private servicesLabel(locale: string): string {
    return locale === "es" ? "Servicios de Automatización" : locale === "it" ? "Servizi di Automazione" : "Automation Services"
  }

  private logoNode(): JsonLdNode {
    return {
      "@type": "ImageObject",
      url: `${this.config.baseUrl}${this.config.organization.logo}`,
      width: 512,
      height: 512
    }
  }

  private contactAction(locale: string): JsonLdNode {
    return { "@type": "ContactAction", target: `${this.config.baseUrl}/${locale}#${CONTACT_ANCHOR}` }
  }

  private organizationNode(locale: string): JsonLdNode {
    const org = this.config.organization
    const services = this.pick(org.services, locale)

    return {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: org.name,
      alternateName: org.alternateName,
      // url de la entidad = raíz canónica, no la ruta de locale: identifica la
      // marca para Knowledge Panel/Sitelinks, no su página en español.
      url: this.config.baseUrl,
      logo: this.logoNode(),
      description: this.pick(org.description, locale),
      foundingDate: "2023",
      // The Person node of the same graph holds the details; copying them here
      // is what let the two descriptions of the founder drift apart.
      founder: { ...personRef(), name: this.config.author.name },
      contactPoint: this.contactPointNode(),
      address: {
        "@type": "PostalAddress",
        addressCountry: org.address.country,
        addressLocality: org.address.locality
      },
      // No sameAs: no brand profile has been verified yet (see entities.ts).
      areaServed: [...org.areaServed],
      knowsAbout: services,
      hasOfferCatalog: this.offerCatalogNode(this.servicesLabel(locale), services),
      // AI-specific metadata
      additionalType: "TechnologyCompany",
      industry: "Information Technology",
      numberOfEmployees: "1-10",
      // Enhanced semantic context
      mainEntityOfPage: `${this.config.baseUrl}/${locale}`,
      potentialAction: this.contactAction(locale),
      ...this.legalNodes(locale)
    }
  }

  private contactPointNode(): JsonLdNode {
    const org = this.config.organization
    return {
      "@type": "ContactPoint",
      email: org.email,
      telephone: org.telephone,
      contactType: "customer service",
      availableLanguage: this.config.supportedLocales.map(loc => LANGUAGE_NAMES[loc] ?? loc)
    }
  }

  private offerCatalogNode(name: string, services: string[], category?: string): JsonLdNode {
    return {
      "@type": "OfferCatalog",
      name,
      itemListElement: services.map((service, index) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: service, ...(category ? { category } : {}) },
        position: index + 1
      }))
    }
  }

  // Legal and privacy information. hasPart deliberately has no dateModified:
  // stamping today's date on every render advertised a freshness that never
  // happened (the audit flagged it as fabricated).
  private legalNodes(locale: string): JsonLdNode {
    const base = `${this.config.baseUrl}/${locale}`
    const page = (path: string, name: string): JsonLdNode => ({
      "@type": "WebPage",
      "@id": `${base}/${path}`,
      name,
      url: `${base}/${path}`
    })

    return {
      privacyPolicy: `${base}/privacy`,
      termsOfService: `${base}/legal`,
      cookiePolicy: `${base}/cookies`,
      hasPart: [
        page("legal", locale === "es" ? "Aviso Legal" : locale === "it" ? "Avviso Legale" : "Legal Notice"),
        page("privacy", locale === "es" ? "Política de Privacidad" : locale === "it" ? "Informativa sulla Privacy" : "Privacy Policy"),
        page("cookies", locale === "es" ? "Política de Cookies" : locale === "it" ? "Politica sui Cookie" : "Cookie Policy")
      ]
    }
  }

  private personNode(locale: string): JsonLdNode {
    const person = this.config.author
    const jobTitle = this.pick(person.jobTitle, locale)
    const expertise = this.pick(person.expertise, locale)

    return {
      "@type": "Person",
      "@id": PERSON_ID,
      name: person.name,
      givenName: "Alberto",
      familyName: "Carrasco",
      jobTitle,
      description: this.pick(person.description, locale),
      url: person.url,
      email: person.email,
      sameAs: [...person.sameAs],
      worksFor: { ...organizationRef(), name: this.config.organization.name },
      knowsAbout: expertise,
      hasOccupation: {
        "@type": "Occupation",
        name: jobTitle,
        occupationLocation: spain(),
        skills: expertise
      },
      // AI-enhanced professional context. No alumniOf: no evidence of the
      // education was ever provided, so it stays out until Alberto confirms it.
      additionalType: "SoftwareDeveloper",
      mainEntityOfPage: person.url,
      potentialAction: {
        "@type": "ContactAction",
        target: `mailto:${person.email}`
      }
    }
  }

  private websiteNode(locale: string): JsonLdNode {
    const org = this.config.organization

    return {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      name: org.name,
      alternateName: org.alternateName,
      // url del WebSite = raíz canónica (ancla del Sitelinks Searchbox), no
      // /locale: es el valor que ya publicaba el layout.
      url: this.config.baseUrl,
      description: this.pick(org.description, locale),
      publisher: organizationRef(),
      inLanguage: locale === "es" ? "es-ES" : locale === "it" ? "it-IT" : "en-US",
      // /blog reads the `q` param (app/[locale]/blog/page.tsx); `search` was ignored.
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${this.config.baseUrl}/${locale}/blog?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      },
      // AI-enhanced website context
      about: {
        "@type": "Thing",
        name: locale === "es" ? "Automatización Empresarial" : locale === "it" ? "Automazione Aziendale" : "Business Automation"
      },
      audience: {
        "@type": "BusinessAudience",
        audienceType: "SME",
        geographicArea: spain()
      }
    }
  }

  private serviceNode(locale: string): JsonLdNode {
    const services = this.pick(this.config.organization.services, locale)

    return {
      "@type": "Service",
      "@id": `${this.config.baseUrl}/${locale}#services`,
      name: this.servicesLabel(locale),
      description: locale === "es" 
        ? "Automatización empresarial, chatbots WhatsApp, desarrollo web y sistemas CRM/ERP"
        : locale === "it"
          ? "Automazione aziendale, chatbot WhatsApp, sviluppo web e sistemi CRM/ERP"
          : "Business automation, WhatsApp chatbots, web development and CRM/ERP systems",
      provider: organizationRef(),
      areaServed: [...this.config.organization.areaServed],
      serviceType: "Technology Consulting",
      category: "Business Automation",
      hasOfferCatalog: this.offerCatalogNode(
        locale === "es" ? "Catálogo de Servicios" : locale === "it" ? "Catalogo dei Servizi" : "Service Catalog",
        services,
        "Business Automation"
      ),
      // AI-enhanced service context
      audience: {
        "@type": "BusinessAudience",
        audienceType: "SME"
      },
      potentialAction: this.contactAction(locale)
    }
  }

  /**
   * Generate Breadcrumb schema for navigation context
   */
  generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): object {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url.startsWith('http') ? item.url : `${this.config.baseUrl}${item.url}`
      }))
    }
  }

  /**
   * Convert Contentlayer Post to BlogPostData
   */
  static fromContentlayerPost(post: Post, baseUrl: string): BlogPostData {
    return {
      title: post.title,
      description: post.description || "",
      author: post.author || "Alberto Carrasco",
      datePublished: post.date,
      dateModified: postModifiedDate(post),
      url: post.url,
      image: post.cover,
      locale: post.locale,
      tags: post.tags,
      wordCount: post.wordCount,
      readingTime: post.readingTime,
      category: post.tags?.[0] // Use first tag as category
    }
  }
}

// Default configuration for E2D
export const defaultJsonLdConfig: JsonLdConfig = {
  baseUrl: SITE_URL,
  defaultLocale: "es",
  supportedLocales: ["es", "en", "it"],
  organization: {
    name: "E2D - Evolve2Digital",
    alternateName: "E2D",
    description: {
      es: "Desarrollo de software a medida, automatización de procesos e integraciones con IA para PYMEs de 10 a 50 empleados. Sin SaaS genérico: tu software, tu negocio.",
      en: "Custom software development, process automation and AI integrations for SMEs of 10 to 50 employees. No generic SaaS: your software, your business.",
      it: "Sviluppo di software su misura, automazione dei processi e integrazioni IA per PMI di 10-50 dipendenti. Niente SaaS generico: il tuo software, il tuo business."
    },
    logo: "/e2d_logo.webp",
    url: SITE_URL,
    email: "hello@evolve2digital.com",
    // telephone omitido: no publicar número placeholder en el schema de
    // Organization (Google podría mostrarlo como teléfono real). El campo es
    // opcional; al quedar undefined, JSON.stringify lo elimina del JSON-LD.
    // Domicilio published in the legal notice; a locality, not a country name.
    address: {
      country: "ES",
      locality: "Madrid"
    },
    services: {
      es: [
        "Desarrollo Web",
        "Automatización con IA",
        "Chatbots WhatsApp",
        "Agentes de Voz",
        "Sistemas CRM",
        "Sistemas ERP",
        "SEO Técnico",
        "Optimización de Performance"
      ],
      en: [
        "Web Development",
        "AI Automation",
        "WhatsApp Chatbots",
        "Voice Agents",
        "CRM Systems",
        "ERP Systems",
        "Technical SEO",
        "Performance Optimization"
      ],
      it: [
        "Sviluppo Web",
        "Automazione con IA",
        "Chatbot WhatsApp",
        "Agenti Vocali",
        "Sistemi CRM",
        "Sistemi ERP",
        "SEO Tecnico",
        "Ottimizzazione delle Performance"
      ]
    },
    areaServed: AREA_SERVED
  },
  author: {
    name: "Alberto Carrasco",
    jobTitle: {
      es: "Desarrollador Fullstack y Especialista en Automatización",
      en: "Full-Stack Developer & Automation Specialist",
      it: "Sviluppatore Full-Stack e Specialista in Automazione"
    },
    description: {
      es: "Experto en React, Next.js, n8n y bases de datos vectoriales. Enfoque en ROI y cumplimiento GDPR para PYMEs españolas.",
      en: "Expert in React, Next.js, n8n and vector databases. Focused on ROI and GDPR compliance for Spanish SMEs.",
      it: "Esperto in React, Next.js, n8n e database vettoriali. Focus su ROI e conformità GDPR per le PMI spagnole."
    },
    url: PERSON_PROFILE_URL,
    email: "hello@evolve2digital.com",
    sameAs: PERSON_SAME_AS,
    worksFor: "E2D - Evolve2Digital",
    expertise: {
      es: [
        "React", "Next.js", "TypeScript", "Node.js", "Python",
        "n8n", "OpenAI", "Claude", "Gemini", "WhatsApp API",
        "Automatización", "SEO", "GDPR", "Bases de datos vectoriales"
      ],
      en: [
        "React", "Next.js", "TypeScript", "Node.js", "Python",
        "n8n", "OpenAI", "Claude", "Gemini", "WhatsApp API",
        "Automation", "SEO", "GDPR", "Vector databases"
      ],
      it: [
        "React", "Next.js", "TypeScript", "Node.js", "Python",
        "n8n", "OpenAI", "Claude", "Gemini", "WhatsApp API",
        "Automazione", "SEO", "GDPR", "Database vettoriali"
      ]
    }
  }
}