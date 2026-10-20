import { PageSection, Paragraph, CardGrid } from "../page-primitives"
import { ProjectCard } from "../project-card"
import {
  DEMO_CLAUDE_SKILLS,
  FERDY,
  OWN_BLOG_PUBLISHING,
  OWN_SITE_ASSISTANT,
  WHATSAPP_DASHBOARD,
} from "@/lib/showcase/projects"

const FERDY_AUTOMATION =
  "Confirmación automática de reservas, venta y entrega automática de ebooks y emails transaccionales automáticos."

export function AutomationExamples() {
  return (
    <PageSection id="ejemplos" title="Ejemplos: casos de clientes, proyectos propios y demostraciones">
      <Paragraph>
        Cada ejemplo lleva una etiqueta que dice qué es: un caso de cliente, un proyecto propio o una demostración. No
        los mezclo.
      </Paragraph>
      <CardGrid>
        <ProjectCard project={FERDY} summary={FERDY_AUTOMATION} />
        <ProjectCard project={WHATSAPP_DASHBOARD} />
        <ProjectCard project={OWN_BLOG_PUBLISHING} />
        <ProjectCard project={OWN_SITE_ASSISTANT} />
        <ProjectCard project={DEMO_CLAUDE_SKILLS} />
      </CardGrid>
    </PageSection>
  )
}
