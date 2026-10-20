import { PageSection, Paragraph } from "../page-primitives"

export function SoftwareMaintenance() {
  return (
    <PageSection id="mantenimiento" title="Mantenimiento tras el despliegue">
      <Paragraph>
        Una solución en producción depende de cosas que cambian: las dependencias de software, las APIs de terceros y
        la infraestructura donde se ejecuta. Mantenerla significa actualizarlas, vigilar que todo siga funcionando y
        adaptar la solución cuando un servicio externo cambia. Las condiciones se acuerdan en cada proyecto.
      </Paragraph>
    </PageSection>
  )
}

export function SoftwareLocation() {
  return (
    <PageSection id="madrid-en-remoto" title="Trabajo desde Madrid, en remoto">
      <Paragraph>
        Trabajo desde Madrid con empresas de la Comunidad de Madrid y del resto de España. Todo el trabajo se hace en
        remoto, así que la ubicación de tu empresa no condiciona el proyecto.
      </Paragraph>
    </PageSection>
  )
}
