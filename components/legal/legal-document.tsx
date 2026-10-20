import { Fragment } from "react"
import type { LegalDocument, LegalSection } from "@/lib/legal/types"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { BlockView } from "./legal-blocks"

function DocumentHeader({ document }: { document: LegalDocument }) {
  return (
    <div className="text-center mb-12">
      {document.backLink && (
        <a href={document.backLink.href} className="text-sm text-muted-foreground hover:text-foreground inline-block mb-4">
          {document.backLink.text}
        </a>
      )}
      {document.eyebrow && (
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{document.eyebrow}</p>
      )}
      <h1 className="text-4xl font-bold mb-4">{document.title}</h1>
      <p className="text-muted-foreground text-lg">
        {document.lastUpdatedLabel}: {document.lastUpdated}
      </p>
      {document.notice && <p className="mt-4 text-sm text-muted-foreground italic">{document.notice}</p>}
    </div>
  )
}

function SectionView({ section }: { section: LegalSection }) {
  return (
    <section id={section.id} className="mb-8">
      {section.title && <h2 className="text-2xl font-semibold mb-4">{section.title}</h2>}
      <div className="space-y-4">
        {section.blocks.map((block, index) => (
          <BlockView key={index} block={block} />
        ))}
      </div>
    </section>
  )
}

/** Server-rendered shell for every legal document (privacy, cookies, legal notice, annex). */
export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <DocumentHeader document={document} />
          <Card className="p-6 sm:p-8">
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              {document.sections.map((section, index) => {
                const previous = document.sections[index - 1]
                const showSeparator = index > 0 && previous?.title !== undefined
                return (
                  <Fragment key={section.id}>
                    {showSeparator && <Separator className="my-8" />}
                    <SectionView section={section} />
                  </Fragment>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
