import { PageSection, Paragraph, BulletList, TextLink } from "../page-primitives"
import { ALL_PRICE_PAGES } from "@/lib/showcase/price-pages"

export function SoftwareBudget() {
  return (
    <PageSection id="presupuesto" title="Cómo se calcula el presupuesto">
      <Paragraph>El presupuesto de un proyecto depende de cuatro factores:</Paragraph>
      <BulletList
        items={[
          "El alcance: qué debe hacer la solución y qué queda fuera.",
          "Las integraciones: cuántas son y con qué herramientas.",
          "Los datos: qué hay que migrar, conectar o ordenar.",
          "El mantenimiento posterior: qué necesita la solución después del despliegue.",
        ]}
      />
      <Paragraph>
        Se cierra por escrito antes de empezar. Como referencia, estas páginas publican el precio de cada servicio:
      </Paragraph>
      <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
        {ALL_PRICE_PAGES.map((page) => (
          <li key={page.href}>
            <TextLink href={page.href}>{page.name}</TextLink>
          </li>
        ))}
      </ul>
    </PageSection>
  )
}
