import { PageSection, Paragraph, CardGrid, InfoCard, TextLink } from "../page-primitives"

const PROCESSES = [
  {
    title: "Captación y cualificación de leads",
    text: "Recoger los datos de quien te escribe, hacer las preguntas básicas para saber si la consulta encaja y enviarlo todo a tu CRM o a tu correo, para que el seguimiento no dependa de acordarse.",
  },
  {
    title: "Emails transaccionales",
    text: "Confirmaciones de reserva, entregas de productos digitales y avisos que se envían solos cuando ocurre algo.",
  },
  {
    title: "Reservas y pagos",
    text: "Que el cliente reserve y pague en línea, por ejemplo con Stripe, sin intercambiar mensajes para cuadrar la agenda y el cobro.",
  },
  {
    title: "Asistentes que responden con tu propio contenido",
    text: "Un asistente que contesta las dudas de tus clientes a partir de tus textos (web, blog, documentación) y no de un conocimiento genérico.",
  },
  {
    title: "Publicación de contenidos",
    text: "Preparar, revisar y publicar artículos o fichas sin pasar por el editor de la web.",
  },
] as const

export function AutomationProcesses() {
  return (
    <PageSection id="procesos" title="Procesos que se pueden automatizar">
      <CardGrid>
        {PROCESSES.map((process) => (
          <InfoCard key={process.title} title={process.title}>
            <p>{process.text}</p>
          </InfoCard>
        ))}
      </CardGrid>
    </PageSection>
  )
}

export function AutomationTools() {
  return (
    <PageSection id="herramientas" title="Herramientas que se pueden conectar">
      <Paragraph>
        CRM, ERP y bases de datos; n8n para orquestar los flujos; WhatsApp; Stripe para los pagos; el correo
        electrónico; y las APIs de modelos de lenguaje como OpenAI, Anthropic Claude, Google Gemini o DeepSeek.
      </Paragraph>
      <Paragraph>
        La condición habitual es que la herramienta ofrezca API, webhooks o exportación de datos. Lo compruebo antes de
        presupuestar. Si además necesitas una aplicación a medida, la tienes explicada en{" "}
        <TextLink href="/es/desarrollo-software-madrid">desarrollo de software a medida</TextLink>.
      </Paragraph>
    </PageSection>
  )
}
