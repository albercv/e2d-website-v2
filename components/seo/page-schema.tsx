interface PageSchemaProps {
  nodes: readonly object[]
}

// One graph per page; the entities (Organization, Person, WebSite) are defined
// once by the layout's SiteGraphSchema and referenced here by @id.
export function PageSchema({ nodes }: PageSchemaProps) {
  const schema = { "@context": "https://schema.org", "@graph": nodes }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      suppressHydrationWarning
    />
  )
}
