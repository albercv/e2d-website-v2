import { JsonLdGenerator, defaultJsonLdConfig } from '@/lib/json-ld-generator'

interface PersonSchemaProps {
  locale: string
}

export function PersonSchema({ locale }: PersonSchemaProps) {
  const generator = new JsonLdGenerator(defaultJsonLdConfig)
  const schema = generator.generatePersonSchema(locale)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      suppressHydrationWarning
    />
  )
}