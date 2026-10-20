import { PageSection, Paragraph } from "../page-primitives"

// Technologies of the fact sheet only (the stack Alberto uses in his own code).
const STACK: ReadonlyArray<{ area: string; tools: string }> = [
  { area: "Web y aplicaciones", tools: "React, Next.js, TypeScript" },
  { area: "Servidor y datos", tools: "Node.js, PostgreSQL, Java Spring Boot, Groovy/Grails" },
  { area: "Automatización e IA", tools: "n8n y las APIs de OpenAI, Anthropic Claude, Google Gemini y DeepSeek" },
  { area: "Integraciones", tools: "API de WhatsApp, Stripe" },
]

export function ProfileStack() {
  return (
    <PageSection id="tecnologias" title="Tecnologías con las que trabajo">
      <Paragraph>Son las tecnologías que uso en mi propio código y en los proyectos que aparecen más abajo.</Paragraph>
      <dl className="divide-y divide-border rounded-lg border border-border">
        {STACK.map((row) => (
          <div key={row.area} className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
            <dt className="font-medium text-foreground">{row.area}</dt>
            <dd className="text-muted-foreground">{row.tools}</dd>
          </div>
        ))}
      </dl>
    </PageSection>
  )
}
