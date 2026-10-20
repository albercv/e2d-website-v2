import { PageHeader, TextLink } from "../page-primitives"

export function AutomationHero() {
  return (
    <PageHeader
      eyebrow="Servicio"
      title="Automatización de procesos con IA para empresas"
      lead={
        <>
          Automatizo tareas repetitivas y conecto las herramientas que ya usas, con inteligencia artificial donde aporta
          valor y con una persona revisando lo importante. Soy{" "}
          <TextLink href="/es/alberto-carrasco">Alberto Carrasco</TextLink> y diseño, programo y despliego cada proyecto
          personalmente.
        </>
      }
    />
  )
}
