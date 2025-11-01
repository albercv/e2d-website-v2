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

import type { Post } from "@/.contentlayer/generated"

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
  socialProfiles: string[]
  services: { [locale: string]: string[] }
  areaServed: string
}

export interface PersonData {
  name: string
  jobTitle: { [locale: string]: string }
  description: { [locale: string]: string }
  url: string
  email: string
  sameAs: string[]
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

export class JsonLdGenerator {
  private config: JsonLdConfig

  constructor(config: JsonLdConfig) {
    this.config = config
  }

  /**
   * Generate Organization schema with AI-optimized metadata
   */
  generateOrganizationSchema(locale: string): object {
    const org = this.config.organization
    
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${this.config.baseUrl}#organization`,
      name: org.name,
      alternateName: org.alternateName,
      url: `${this.config.baseUrl}/${locale}`,
      logo: {
        "@type": "ImageObject",
        url: `${this.config.baseUrl}${org.logo}`,
        width: 512,
        height: 512
      },
      description: org.description[locale] || org.description[this.config.defaultLocale],
      foundingDate: "2023",
      founder: {
        "@type": "Person",
        "@id": `${this.config.baseUrl}#person`,
        name: this.config.author.name,
        jobTitle: this.config.author.jobTitle[locale] || this.config.author.jobTitle[this.config.defaultLocale],
        url: this.config.author.url,
        sameAs: this.config.author.sameAs
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: org.email,
        telephone: org.telephone,
        contactType: "customer service",
        availableLanguage: this.config.supportedLocales.map(loc =>
          loc === "es" ? "Spanish" : loc === "en" ? "English" : loc === "it" ? "Italian" : loc
        )
      },
      address: {
        "@type": "PostalAddress",
        addressCountry: org.address.country,
        addressLocality: org.address.locality
      },
      sameAs: org.socialProfiles,
      serviceArea: {
        "@type": "Country",
        name: org.areaServed
      },
      areaServed: org.areaServed,
      knowsAbout: org.services[locale] || org.services[this.config.defaultLocale],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: locale === "es" ? "Servicios de Automatización" : locale === "it" ? "Servizi di Automazione" : "Automation Services",
        itemListElement: (org.services[locale] || org.services[this.config.defaultLocale]).map((service, index) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: service
          },
          position: index + 1
        }))
      },
      // AI-specific metadata
      additionalType: "TechnologyCompany",
      industry: "Information Technology",
      numberOfEmployees: "1-10",
      // Enhanced semantic context
      mainEntityOfPage: `${this.config.baseUrl}/${locale}`,
      potentialAction: {
        "@type": "ContactAction",
        target: `${this.config.baseUrl}/${locale}#contact`
      },
      // Legal and privacy information
      privacyPolicy: `${this.config.baseUrl}/${locale}/privacy`,
      termsOfService: `${this.config.baseUrl}/${locale}/legal`,
      cookiePolicy: `${this.config.baseUrl}/${locale}/cookies`,
      hasPart: [
        {
          "@type": "WebPage",
          "@id": `${this.config.baseUrl}/${locale}/legal`,
          name: locale === "es" ? "Aviso Legal" : locale === "it" ? "Avviso Legale" : "Legal Notice",
          url: `${this.config.baseUrl}/${locale}/legal`,
          dateModified: new Date().toISOString().split('T')[0]
        },
        {
          "@type": "WebPage", 
          "@id": `${this.config.baseUrl}/${locale}/privacy`,
          name: locale === "es" ? "Política de Privacidad" : locale === "it" ? "Informativa sulla Privacy" : "Privacy Policy",
          url: `${this.config.baseUrl}/${locale}/privacy`,
          dateModified: new Date().toISOString().split('T')[0]
        },
        {
          "@type": "WebPage",
          "@id": `${this.config.baseUrl}/${locale}/cookies`,
          name: locale === "es" ? "Política de Cookies" : locale === "it" ? "Politica sui Cookie" : "Cookie Policy", 
          url: `${this.config.baseUrl}/${locale}/cookies`,
          dateModified: new Date().toISOString().split('T')[0]
        }
      ]
    }
  }

  /**
   * Generate Person schema for author with enhanced AI context
   */
  generatePersonSchema(locale: string): object {
    const person = this.config.author
    
    return {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": `${this.config.baseUrl}#person`,
      name: person.name,
      givenName: "Alberto",
      familyName: "Carrasco",
      jobTitle: person.jobTitle[locale] || person.jobTitle[this.config.defaultLocale],
      description: person.description[locale] || person.description[this.config.defaultLocale],
      url: person.url,
      email: person.email,
      sameAs: person.sameAs,
      worksFor: {
        "@type": "Organization",
        "@id": `${this.config.baseUrl}#organization`,
        name: this.config.organization.name
      },
      knowsAbout: person.expertise[locale] || person.expertise[this.config.defaultLocale],
      hasOccupation: {
        "@type": "Occupation",
        name: person.jobTitle[locale] || person.jobTitle[this.config.defaultLocale],
        occupationLocation: {
          "@type": "Country",
          name: this.config.organization.areaServed
        },
        skills: person.expertise[locale] || person.expertise[this.config.defaultLocale]
      },
      // AI-enhanced professional context
      additionalType: "SoftwareDeveloper",
      alumniOf: {
        "@type": "EducationalOrganization",
        name: "Universidad Politécnica de Madrid"
      },
      // Enhanced semantic relationships
      mainEntityOfPage: `${this.config.baseUrl}/${locale}#about`,
      potentialAction: {
        "@type": "ContactAction",
        target: `mailto:${person.email}`
      }
    }
  }

  /**
   * Generate BlogPosting schema with AI-optimized metadata
   */
  generateBlogPostSchema(post: BlogPostData): object {
    const baseUrl = this.config.baseUrl
    const fullUrl = `${baseUrl}${post.url}`
    
    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": fullUrl,
      headline: post.title,
      description: post.description,
      author: {
        "@type": "Person",
        "@id": `${baseUrl}#person`,
        name: post.author,
        url: this.config.author.url
      },
      publisher: {
        "@type": "Organization",
        "@id": `${baseUrl}#organization`,
        name: this.config.organization.name,
        logo: {
          "@type": "ImageObject",
          url: `${baseUrl}${this.config.organization.logo}`,
          width: 512,
          height: 512
        }
      },
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
      // Enhanced content metadata
      articleSection: post.category || (post.locale === "es" ? "Automatización" : "Automation"),
      keywords: post.tags || [
        "automatización", "chatbots", "WhatsApp", "voicebots", "PYME",
        "desarrollo web", "React", "Next.js", "n8n", "IA"
      ],
      wordCount: post.wordCount,
      timeRequired: post.readingTime ? `PT${Math.ceil(post.readingTime.minutes)}M` : "PT5M",
      // AI-specific enhancements
      about: {
        "@type": "Thing",
        name: post.locale === "es" ? "Automatización Empresarial" : "Business Automation"
      },
      mentions: post.tags?.map(tag => ({
        "@type": "Thing",
        name: tag
      })) || [],
      // Enhanced semantic context
      potentialAction: {
        "@type": "ReadAction",
        target: fullUrl
      },
      // Content quality indicators for AI
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        ratingCount: "1",
        bestRating: "5"
      }
    }
  }

  /**
   * Generate Website schema with comprehensive metadata
   */
  generateWebsiteSchema(locale: string): object {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${this.config.baseUrl}#website`,
      name: this.config.organization.name,
      alternateName: this.config.organization.alternateName,
      url: `${this.config.baseUrl}/${locale}`,
      description: this.config.organization.description[locale] || this.config.organization.description[this.config.defaultLocale],
      publisher: {
        "@type": "Organization",
        "@id": `${this.config.baseUrl}#organization`
      },
      inLanguage: locale === "es" ? "es-ES" : locale === "it" ? "it-IT" : "en-US",
      // Enhanced search functionality
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${this.config.baseUrl}/${locale}/blog?search={search_term_string}`
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
        geographicArea: {
          "@type": "Country",
          name: "Spain"
        }
      }
    }
  }

  /**
   * Generate Service schema for business offerings
   */
  generateServiceSchema(locale: string): object {
    const services = this.config.organization.services[locale] || this.config.organization.services[this.config.defaultLocale]
    
    return {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${this.config.baseUrl}/${locale}#services`,
      name: locale === "es" ? "Servicios de Automatización" : locale === "it" ? "Servizi di Automazione" : "Automation Services",
      description: locale === "es" 
        ? "Automatización empresarial, chatbots WhatsApp, desarrollo web y sistemas CRM/ERP"
        : locale === "it"
          ? "Automazione aziendale, chatbot WhatsApp, sviluppo web e sistemi CRM/ERP"
          : "Business automation, WhatsApp chatbots, web development and CRM/ERP systems",
      provider: {
        "@type": "Organization",
        "@id": `${this.config.baseUrl}#organization`
      },
      areaServed: {
        "@type": "Country",
        name: this.config.organization.areaServed
      },
      serviceType: "Technology Consulting",
      category: "Business Automation",
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: locale === "es" ? "Catálogo de Servicios" : locale === "it" ? "Catalogo dei Servizi" : "Service Catalog",
        itemListElement: services.map((service, index) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: service,
            category: "Business Automation"
          },
          position: index + 1
        }))
      },
      // AI-enhanced service context
      audience: {
        "@type": "BusinessAudience",
        audienceType: "SME"
      },
      potentialAction: {
        "@type": "ContactAction",
        target: `${this.config.baseUrl}/${locale}#contact`
      }
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
      description: post.description,
      author: post.author,
      datePublished: post.date,
      dateModified: post.date, // Could be enhanced with actual modification date
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
  baseUrl: "https://evolve2digital.com",
  defaultLocale: "es",
  supportedLocales: ["es", "en", "it"],
  organization: {
    name: "E2D - Evolve2Digital",
    alternateName: "E2D",
    description: {
      es: "Automatiza tu empresa: más ventas, menos tareas. Agentes de voz, chatbots WhatsApp y automatizaciones para clínicas, inmobiliarias y asesorías.",
      en: "Automate your company: more sales, fewer tasks. Voice agents, WhatsApp chatbots and automations for clinics, real estate and consultancies.",
      it: "Automatizza la tua azienda: più vendite, meno compiti. Agenti vocali, chatbot WhatsApp e automazioni per cliniche, immobiliari e consulenze."
    },
    logo: "/e2d_logo.webp",
    url: "https://evolve2digital.com",
    email: "hello@evolve2digital.com",
    telephone: "+34-600-000-000",
    address: {
      country: "ES",
      locality: "España"
    },
    socialProfiles: [
      "https://github.com/albertocarrasco",
      "https://linkedin.com/in/albertocarrasco",
      "https://twitter.com/albertocarrasco"
    ],
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
    areaServed: "Spain"
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
    url: "https://evolve2digital.com",
    email: "hello@evolve2digital.com",
    sameAs: [
      "https://github.com/albertocarrasco",
      "https://linkedin.com/in/albertocarrasco",
      "https://twitter.com/albertocarrasco"
    ],
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