import { JsonLdGenerator, defaultJsonLdConfig, type BlogPostData } from '@/lib/json-ld-generator'

interface OrganizationSchemaProps {
  locale: string
}

export function OrganizationSchema({ locale }: OrganizationSchemaProps) {
  const generator = new JsonLdGenerator(defaultJsonLdConfig)
  const schema = generator.generateOrganizationSchema(locale)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      suppressHydrationWarning
    />
  )
}

interface ServiceSchemaProps {
  locale: string
}

export function ServiceSchema({ locale }: ServiceSchemaProps) {
  const services = [
    {
      "@type": "Service",
      name: locale === "es" ? "Desarrollo Web" : "Web Development",
      description:
        locale === "es"
          ? "Desarrollo de sitios web con Next.js, SEO técnico, performance y accesibilidad WCAG AA"
          : "Next.js website development, technical SEO, performance and WCAG AA accessibility",
      provider: {
        "@type": "Organization",
        name: "E2D - Evolve2Digital",
      },
      serviceType: "Web Development",
      category: "Technology",
    },
    {
      "@type": "Service",
      name: locale === "es" ? "Automatizaciones" : "Automations",
      description:
        locale === "es"
          ? "n8n, voicebots, WhatsApp bots, scraping y outreach para PYMEs"
          : "n8n, voicebots, WhatsApp bots, scraping and outreach for SMEs",
      provider: {
        "@type": "Organization",
        name: "E2D - Evolve2Digital",
      },
      serviceType: "Business Automation",
      category: "Technology",
    },
    {
      "@type": "Service",
      name: locale === "es" ? "Sistemas CRM" : "CRM Systems",
      description:
        locale === "es"
          ? "Pipeline de ventas y automatizaciones de seguimiento personalizadas"
          : "Custom sales pipeline and follow-up automations",
      provider: {
        "@type": "Organization",
        name: "E2D - Evolve2Digital",
      },
      serviceType: "CRM Development",
      category: "Technology",
    },
    {
      "@type": "Service",
      name: locale === "es" ? "Sistemas ERP" : "ERP Systems",
      description:
        locale === "es"
          ? "Inventarios, facturación y compras integradas para PYMEs"
          : "Integrated inventory, billing and purchasing for SMEs",
      provider: {
        "@type": "Organization",
        name: "E2D - Evolve2Digital",
      },
      serviceType: "ERP Development",
      category: "Technology",
    },
  ]

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: services.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: service,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      suppressHydrationWarning
    />
  )
}

interface WebsiteSchemaProps {
  locale: string
}

export function WebsiteSchema({ locale }: WebsiteSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "E2D - Evolve2Digital",
    url: `https://evolve2digital.com/${locale}`,
    description:
      locale === "es"
        ? "Automatiza tu empresa: más ventas, menos tareas. Especialistas en automatización para PYMEs españolas."
        : "Automate your company: more sales, fewer tasks. Automation specialists for Spanish companies",
    inLanguage: locale === "es" ? "es-ES" : "en-US",
    isPartOf: {
      "@type": "WebSite",
      url: "https://evolve2digital.com",
    },
    about: {
      "@type": "Organization",
      name: "E2D - Evolve2Digital",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `https://evolve2digital.com/${locale}/blog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      suppressHydrationWarning
    />
  )
}

interface BreadcrumbSchemaProps {
  items: Array<{ name: string; url: string }>
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      suppressHydrationWarning
    />
  )
}

interface BlogPostSchemaProps {
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

export function BlogPostSchema({
  title,
  description,
  author,
  datePublished,
  dateModified,
  url,
  image,
  locale,
  tags,
  wordCount,
  readingTime,
  category,
}: BlogPostSchemaProps) {
  const generator = new JsonLdGenerator(defaultJsonLdConfig)
  
  const blogPostData: BlogPostData = {
    title,
    description,
    author,
    datePublished,
    dateModified,
    url,
    image,
    locale,
    tags,
    wordCount,
    readingTime,
    category,
  }
  
  const schema = generator.generateBlogPostSchema(blogPostData)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      suppressHydrationWarning
    />
  )
}
