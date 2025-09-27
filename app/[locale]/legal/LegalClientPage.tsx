"use client"

import { useTranslations } from "next-intl"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function LegalClientPage() {
  const t = useTranslations("legal")

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Aviso Legal</h1>
            <p className="text-muted-foreground text-lg">Última actualización: 26 de septiembre de 2025</p>
          </div>

          <Card className="p-8">
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Información General</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de
                  Comercio Electrónico, se informa de los siguientes datos:
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p>
                    <strong>Denominación social:</strong> Alberto Carrasco Hernández
                  </p>
                  <p>
                    <strong>Nombre comercial:</strong> E2D - Evolve2Digital
                  </p>
                  <p>
                    <strong>NIF:</strong> 12345678Z
                  </p>
                  <p>
                    <strong>Domicilio:</strong> Madrid, España
                  </p>
                  <p>
                    <strong>Email:</strong> alberto@evolve2digital.com
                  </p>
                  <p>
                    <strong>Teléfono:</strong> +34 123 456 789
                  </p>
                </div>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Objeto</h2>
                <p className="text-muted-foreground leading-relaxed">
                  El presente aviso legal regula el uso del sitio web evolve2digital.com, del que es titular Alberto
                  Carrasco Hernández. La navegación por el sitio web atribuye la condición de usuario del mismo e
                  implica la aceptación plena y sin reservas de todas las disposiciones incluidas en este aviso legal.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Condiciones de Uso</h2>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>El acceso a este sitio web es responsabilidad exclusiva de los usuarios</li>
                  <li>El uso del sitio web implica el conocimiento y aceptación de las advertencias legales</li>
                  <li>El usuario se compromete a hacer un uso adecuado de los contenidos y servicios</li>
                  <li>Queda prohibido utilizar el sitio web para actividades ilícitas o lesivas</li>
                </ul>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Propiedad Intelectual</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Todos los contenidos del sitio web, incluyendo textos, fotografías, gráficos, imágenes, iconos,
                  tecnología, software, así como su diseño gráfico y códigos fuente, constituyen una obra cuya propiedad
                  pertenece a Alberto Carrasco Hernández, sin que puedan entenderse cedidos al usuario ninguno de los
                  derechos de explotación sobre los mismos.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Limitación de Responsabilidad</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Alberto Carrasco Hernández no se hace responsable de:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>La continuidad y disponibilidad de los contenidos</li>
                  <li>La ausencia de errores en dichos contenidos</li>
                  <li>La ausencia de virus y/o demás componentes dañinos</li>
                  <li>Los daños o perjuicios causados por terceros mediante intromisiones ilegítimas</li>
                </ul>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Modificaciones</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Alberto Carrasco Hernández se reserva el derecho de efectuar sin previo aviso las modificaciones que
                  considere oportunas en su portal, pudiendo cambiar, suprimir o añadir tanto los contenidos y servicios
                  que se presten a través de la misma como la forma en la que éstos aparezcan presentados o localizados
                  en su portal.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Legislación Aplicable</h2>
                <p className="text-muted-foreground leading-relaxed">
                  La relación entre Alberto Carrasco Hernández y el usuario se regirá por la normativa española vigente
                  y cualquier controversia se someterá a los Juzgados y tribunales de la ciudad de Madrid.
                </p>
              </section>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
