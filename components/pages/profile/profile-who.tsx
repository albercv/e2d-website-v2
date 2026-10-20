import { PageSection, Paragraph, InfoCard, CardGrid, TextLink } from "../page-primitives"
import { LEGAL_NOTICE_PATH } from "@/lib/showcase/projects"

export function ProfileWho() {
  return (
    <PageSection id="quien-soy" title="Quién soy">
      <Paragraph>
        Soy desarrollador de software y el fundador de Evolve2Digital. Soy también el titular de este sitio web, con
        domicilio en Madrid, tal como consta en el <TextLink href={LEGAL_NOTICE_PATH}>aviso legal</TextLink>.
      </Paragraph>
      <Paragraph>
        Trabajo con empresas de España y del norte de Europa, en español y en inglés. Quien te atiende en la primera
        conversación es también quien escribe el código.
      </Paragraph>
    </PageSection>
  )
}

export function ProfileSpecialties() {
  return (
    <PageSection id="a-que-me-dedico" title="A qué me dedico">
      <Paragraph>Tres líneas de trabajo:</Paragraph>
      <CardGrid>
        <InfoCard title="Software a medida">
          <p>
            Aplicaciones web, tiendas online, webs corporativas y paneles de control hechos a la medida de cómo trabaja
            cada empresa.
          </p>
          <p>
            <TextLink href="/es/desarrollo-software-madrid">Desarrollo de software a medida</TextLink>
          </p>
        </InfoCard>
        <InfoCard title="Integraciones">
          <p>
            Conecto las herramientas que ya usas (bases de datos, pagos con Stripe, WhatsApp, correo, CRM o ERP) para que
            los datos dejen de copiarse a mano de un sitio a otro.
          </p>
        </InfoCard>
        <InfoCard title="Automatización con IA">
          <p>
            Automatizo procesos con n8n y con modelos de OpenAI, Anthropic Claude, Google Gemini y DeepSeek: asistentes
            que responden con tu propio contenido, emails transaccionales, reservas y publicación de contenidos.
          </p>
          <p>
            <TextLink href="/es/automatizacion-procesos-ia">Automatización de procesos con IA</TextLink>
          </p>
        </InfoCard>
      </CardGrid>
    </PageSection>
  )
}
