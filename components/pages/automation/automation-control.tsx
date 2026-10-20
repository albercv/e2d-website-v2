import { PageSection, Paragraph, BulletList } from "../page-primitives"

export function AutomationData() {
  return (
    <PageSection id="datos-necesarios" title="Qué datos necesito">
      <BulletList
        items={[
          "Acceso a las herramientas implicadas, con los permisos mínimos necesarios.",
          "Ejemplos reales del proceso: cómo se hace hoy, qué casos son habituales y cuáles son excepciones.",
          "El contenido propio con el que debe responder un asistente: textos, preguntas frecuentes, documentación.",
          "Las reglas de negocio: qué puede decidirse automáticamente y qué no.",
        ]}
      />
      <Paragraph>
        También identifico qué datos personales intervienen, porque condicionan cómo se diseña el proceso.
      </Paragraph>
    </PageSection>
  )
}

export function AutomationHumans() {
  return (
    <PageSection id="intervencion-humana" title="Dónde interviene una persona">
      <Paragraph>
        Automatizar no es quitar a las personas del proceso. Antes de construir, defino contigo qué hace el sistema
        solo, dónde se revisa y quién aprueba cada decisión.
      </Paragraph>
      <BulletList
        items={[
          "Puntos de revisión: el sistema puede preparar una respuesta, un borrador o un informe, y una persona decide si se envía o se publica.",
          "Quién aprueba qué: cada decisión con impacto, como un cobro, una oferta o una publicación, tiene un responsable concreto.",
          "Qué pasa cuando el sistema no sabe: debe poder pasar la conversación a una persona en lugar de inventar una respuesta.",
        ]}
      />
    </PageSection>
  )
}

export function AutomationLimits() {
  return (
    <PageSection id="limites" title="Límites">
      <Paragraph>Lo que la automatización y la IA no deberían decidir solas, y lo que conviene saber antes de empezar:</Paragraph>
      <BulletList
        items={[
          "Decisiones con consecuencias legales, económicas o sobre personas: requieren revisión humana.",
          "Errores: un modelo de IA puede equivocarse o responder con seguridad algo incorrecto. Por eso se limita su ámbito, se revisan sus respuestas y se prevén las excepciones.",
          "Coste de las APIs de terceros: los modelos de IA, la mensajería o los pagos tienen su propio precio, que fijan sus proveedores y varía con el uso. Lo detallo en la propuesta.",
          "Dependencia de proveedores: un proveedor puede cambiar precios, límites o condiciones, o dejar de ofrecer un servicio, y el flujo que depende de él tendría que adaptarse.",
        ]}
      />
    </PageSection>
  )
}

export function AutomationMaintenance() {
  return (
    <PageSection id="mantenimiento" title="Mantenimiento">
      <Paragraph>
        Un flujo automatizado se apoya en servicios que cambian: las APIs de terceros, los modelos de IA y las propias
        herramientas conectadas. Mantenerlo significa vigilar que siga funcionando, actualizar sus dependencias y
        adaptarlo cuando algo externo cambia. Las condiciones se acuerdan en cada proyecto.
      </Paragraph>
    </PageSection>
  )
}
