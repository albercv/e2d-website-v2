import { CONTACT_EMAIL, CONTACT_HREF } from "@/lib/showcase/projects"
import { Paragraph, PageSection, TextLink } from "./page-primitives"

export interface RelatedLink {
  href: string
  text: string
}

// Same closing block on every Spanish-only page: one place to change how a
// reader is invited to get in touch.
export function PageContact({ related }: { related: readonly RelatedLink[] }) {
  return (
    <PageSection id="contacto-directo" title="Contacto">
      <Paragraph>
        Cuéntame qué necesitas desde el <TextLink href={CONTACT_HREF}>formulario de contacto</TextLink> o escríbeme a{" "}
        <TextLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</TextLink>.
      </Paragraph>
      {related.length > 0 && (
        <nav aria-label="Páginas relacionadas">
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            {related.map((link) => (
              <li key={link.href}>
                <TextLink href={link.href}>{link.text}</TextLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </PageSection>
  )
}
