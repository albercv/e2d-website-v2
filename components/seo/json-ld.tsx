import { JsonLdGenerator, defaultJsonLdConfig, type BlogPostData } from '@/lib/json-ld-generator'

interface SiteGraphSchemaProps {
  locale: string
}

// One script for the whole site identity: Organization, Person, WebSite and the
// service catalogue share ids, so crawlers merge them into a single entity
// graph instead of reading four unrelated documents.
export function SiteGraphSchema({ locale }: SiteGraphSchemaProps) {
  const generator = new JsonLdGenerator(defaultJsonLdConfig)
  const schema = generator.generateSiteGraph(locale)

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
      // Google exige URLs absolutas en BreadcrumbList; con rutas relativas
      // (`/es`, `/es/blog`) descarta el rich result en silencio.
      item: /^https?:\/\//.test(item.url) ? item.url : `https://evolve2digital.com${item.url}`,
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
