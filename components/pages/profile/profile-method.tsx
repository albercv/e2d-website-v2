import { PageSection, Paragraph, BulletList, TextLink } from "../page-primitives"
import { PERSON_SAME_AS, PORTFOLIO_URL_BY_LOCALE } from "@/lib/seo/entities"

export function ProfileMethod() {
  return (
    <PageSection id="como-trabajo" title="Cómo trabajo">
      <Paragraph>
        Diseño, programo y despliego personalmente cada proyecto: hablas directamente con quien escribe el código.
        Primero analizo el problema, después preparo una propuesta escrita con alcance y presupuesto, desarrollo por
        entregas, despliego y me ocupo del mantenimiento.
      </Paragraph>
      <Paragraph>
        Trabajo en remoto desde Madrid, en español o en inglés. El detalle de cada fase está en la página de{" "}
        <TextLink href="/es/desarrollo-software-madrid">desarrollo de software a medida</TextLink>.
      </Paragraph>
    </PageSection>
  )
}

export function ProfileLinks() {
  const [github] = PERSON_SAME_AS

  return (
    <PageSection id="perfiles" title="Perfiles y enlaces">
      <BulletList
        items={[
          <>
            Mi código en{" "}
            <TextLink href={github} external>
              GitHub
            </TextLink>
            .
          </>,
          <>
            Mi portfolio de proyectos:{" "}
            <TextLink href={PORTFOLIO_URL_BY_LOCALE.es} external>
              e2dprojects.com
            </TextLink>
            .
          </>,
          <>
            Mis datos como titular de esta web, en el <TextLink href="/es/legal">aviso legal</TextLink>.
          </>,
        ]}
      />
    </PageSection>
  )
}
