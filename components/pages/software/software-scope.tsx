import { PageSection, Paragraph, BulletList } from "../page-primitives"

const strong = (text: string) => <strong className="font-semibold text-foreground">{text}</strong>

export function SoftwareProblems() {
  return (
    <PageSection id="problemas" title="Problemas que resuelve">
      <Paragraph>
        Una empresa que crece suele notar antes que nadie dónde se queda corta su tecnología. Estos son los problemas
        con los que suelo empezar:
      </Paragraph>
      <BulletList
        items={[
          "Los datos viven en hojas de cálculo, correos y herramientas que no se hablan entre sí, y alguien los copia a mano de un sitio a otro.",
          "Un proceso clave depende de tareas manuales y repetitivas que consumen tiempo y admiten errores.",
          "Ninguna herramienta del mercado encaja bien con cómo trabajas, y adaptarte a ella te frena.",
          "La web o la aplicación actual ya no acompaña lo que el negocio necesita: vender online, reservar, cobrar o mostrar datos.",
        ]}
      />
    </PageSection>
  )
}

export function SoftwareProjectTypes() {
  return (
    <PageSection id="tipos-de-proyecto" title="Tipos de proyecto">
      <BulletList
        items={[
          <>{strong("Webs y aplicaciones web a medida.")} Páginas de programas o servicios, reservas, áreas privadas.</>,
          <>{strong("Tiendas online.")} Comercio electrónico con el catálogo y el proceso de compra que necesitas.</>,
          <>{strong("Webs corporativas.")} Presencia de empresa clara, rápida y fácil de mantener.</>,
          <>{strong("Paneles de control.")} Estadísticas y visores de datos para ver lo que ocurre en tu negocio.</>,
          <>{strong("CRM y ERP a medida.")} Seguimiento de clientes, pedidos, inventario o facturación.</>,
          <>{strong("Reservas y pagos online.")} Reserva y cobro con Stripe sin intercambiar mensajes manuales.</>,
        ]}
      />
    </PageSection>
  )
}
