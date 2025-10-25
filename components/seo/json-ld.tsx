interface OrganizationSchemaProps {
  locale: string
}

export function OrganizationSchema({ locale }: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "E2D - Evolve2Digital",
    alternateName: "E2D",
    url: `https://evolve2digital.com/${locale}`,
    logo: "/e2d_logo.webp",
    description:
      locale === "es"
        ? "Automatiza tu pyme: más ventas, menos tareas. Agentes de voz, chatbots WhatsApp y automatizaciones para clínicas, inmobiliarias y asesorías."
        : "Automate your SME: more sales, fewer tasks. Voice agents, WhatsApp chatbots and automations for clinics, real estate and consultancies.",
    founder: {
      "@type": "Person",
      name: "Alberto Carrasco",
      jobTitle: "Full-Stack Architect & Automation Specialist",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+34-600-000-000",
      contactType: "customer service",
      email: "hello@evolve2digital.com",
      availableLanguage: ["Spanish", "English"],
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "ES",
      addressLocality: "España",
    },
    sameAs: [
      "https://github.com/albertocarrasco",
      "https://linkedin.com/in/albertocarrasco",
      "https://twitter.com/albertocarrasco",
    ],
    serviceArea: {
      "@type": "Country",
      name: "Spain",
    },
    areaServed: "Spain",
    knowsAbout: [
      "Web Development",
      "Process Automation",
      "WhatsApp Bots",
      "Voice Bots",
      "CRM Systems",
      "ERP Systems",
      "React",
      "Next.js",
      "n8n",
      "GDPR Compliance",
    ],
  }

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
        ? "Automatiza tu pyme: más ventas, menos tareas. Especialistas en automatización para PYMEs españolas."
        : "Automate your SME: more sales, fewer tasks. Automation specialists for Spanish SMEs.",
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
}: BlogPostSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    author: {
      "@type": "Person",
      name: author,
      url: "https://evolve2digital.com",
    },
    publisher: {
      "@type": "Organization",
      name: "E2D - Evolve2Digital",
      logo: {
        "@type": "ImageObject",
        url: "/e2d_logo.webp",
      }
    },
    datePublished,
    dateModified: dateModified || datePublished,
    url,
    image: image || "https://evolve2digital.com/og-image.png",
    inLanguage: locale === "es" ? "es-ES" : "en-US",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    articleSection: locale === "es" ? "Automatización" : "Automation",
    keywords: [
      "automatización",
      "chatbots",
      "WhatsApp",
      "voicebots",
      "PYME",
      "desarrollo web",
      "React",
      "Next.js",
      "n8n",
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      suppressHydrationWarning
    />
  )
}
