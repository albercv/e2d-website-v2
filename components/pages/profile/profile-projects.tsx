import { PageSection, Paragraph, CardGrid } from "../page-primitives"
import { ProjectCard } from "../project-card"
import {
  DELIVERED_PROJECTS,
  OWN_BLOG_PUBLISHING,
  OWN_PORTFOLIO,
  OWN_SITE_ASSISTANT,
} from "@/lib/showcase/projects"

export function ProfileDeliveredProjects() {
  return (
    <PageSection id="proyectos-entregados" title="Proyectos entregados">
      <Paragraph>
        Proyectos que he diseñado, programado y desplegado. Enlazo el sitio público cuando el cliente tiene dominio
        propio.
      </Paragraph>
      <CardGrid>
        {DELIVERED_PROJECTS.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </CardGrid>
    </PageSection>
  )
}

export function ProfileOwnProjects() {
  return (
    <PageSection id="proyectos-propios" title="Proyectos propios">
      <Paragraph>Estos proyectos son míos: no son casos de clientes.</Paragraph>
      <CardGrid>
        <ProjectCard project={OWN_BLOG_PUBLISHING} />
        <ProjectCard project={OWN_SITE_ASSISTANT} />
        <ProjectCard project={OWN_PORTFOLIO} />
      </CardGrid>
    </PageSection>
  )
}
