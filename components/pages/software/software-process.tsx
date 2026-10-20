import { PageSection, Paragraph, StepList, TextLink } from "../page-primitives"

const STEPS = [
  {
    title: "Análisis",
    text: "Entiendo cómo trabajas hoy, qué necesitas resolver y qué herramientas y datos están implicados.",
  },
  {
    title: "Propuesta escrita con alcance y presupuesto",
    text: "Recibes por escrito qué se va a construir, qué queda fuera y cuánto cuesta, antes de empezar.",
  },
  {
    title: "Desarrollo por entregas",
    text: "Construyo por partes que puedes ver y probar, en lugar de esperar al final para ver algo funcionando.",
  },
  {
    title: "Despliegue",
    text: "Pongo la solución en producción y compruebo que funciona con tus datos y con tus herramientas.",
  },
  {
    title: "Mantenimiento",
    text: "Tras el despliegue la solución sigue necesitando atención. Las condiciones se acuerdan en cada proyecto.",
  },
] as const

export function SoftwareProcess() {
  return (
    <PageSection id="como-trabajo" title="Cómo trabajo">
      <StepList steps={STEPS} />
    </PageSection>
  )
}

export function SoftwareIntegrations() {
  return (
    <PageSection id="integraciones" title="Integraciones">
      <Paragraph>
        Muchos proyectos no empiezan de cero: hay que conectarlos con lo que ya usas. Puedo integrar CRM, ERP, bases de
        datos, pagos con Stripe, WhatsApp, correo electrónico, n8n y las APIs de modelos de IA como OpenAI, Anthropic
        Claude, Google Gemini o DeepSeek.
      </Paragraph>
      <Paragraph>
        Una integración es posible cuando la herramienta ofrece API, webhooks o exportación de datos. Lo reviso antes de
        presupuestar, para no prometer algo que la herramienta no permite.
      </Paragraph>
      <Paragraph>
        Si lo que buscas es automatizar procesos con IA, tienes más detalle en{" "}
        <TextLink href="/es/automatizacion-procesos-ia">automatización de procesos con IA</TextLink>.
      </Paragraph>
    </PageSection>
  )
}
