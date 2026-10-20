import { PageSection, Paragraph, CardGrid, TextLink } from "../page-primitives"
import { ProjectCard } from "../project-card"
import { PORTFOLIO_URL_BY_LOCALE } from "@/lib/seo/entities"
import { ABY_FOODS, AUGUST_COLLECTION, FERDY, WHATSAPP_DASHBOARD } from "@/lib/showcase/projects"

const EXAMPLES = [FERDY, AUGUST_COLLECTION, ABY_FOODS, WHATSAPP_DASHBOARD]

export function SoftwareExamples() {
  return (
    <PageSection id="ejemplos" title="Ejemplos">
      <Paragraph>Proyectos que he entregado, con enlace público cuando el cliente tiene dominio propio.</Paragraph>
      <CardGrid>
        {EXAMPLES.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </CardGrid>
      <Paragraph>
        En mi <TextLink href="/es/alberto-carrasco">perfil</TextLink> tienes todos los proyectos, incluidos los propios,
        y en{" "}
        <TextLink href={PORTFOLIO_URL_BY_LOCALE.es} external>
          e2dprojects.com
        </TextLink>{" "}
        mi portfolio.
      </Paragraph>
    </PageSection>
  )
}
