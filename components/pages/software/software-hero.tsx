import { PageHeader, TextLink } from "../page-primitives"

export function SoftwareHero() {
  return (
    <PageHeader
      eyebrow="Servicio"
      title="Desarrollo de software a medida para empresas en Madrid"
      lead={
        <>
          Trabajo desde Madrid con empresas de la Comunidad de Madrid y del resto de España, en remoto. Soy{" "}
          <TextLink href="/es/alberto-carrasco">Alberto Carrasco</TextLink> y diseño, programo y despliego cada proyecto
          personalmente.
        </>
      }
    />
  )
}
