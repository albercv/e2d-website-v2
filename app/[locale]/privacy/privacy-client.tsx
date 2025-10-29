"use client"

import { useTranslations } from "next-intl"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function PrivacyClientPage() {
  const t = useTranslations("privacy")

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">{t("title")}</h1>
            <p className="text-muted-foreground text-lg">{t("lastUpdated")}: 26 de septiembre de 2025</p>
          </div>

          <Card className="p-8">
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">{t("sections.introduction.title")}</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  En E2D (Evolve2Digital), respetamos su privacidad y nos comprometemos a proteger sus datos personales.
                  Esta política de privacidad explica cómo recopilamos, utilizamos y protegemos su información cuando
                  utiliza nuestros servicios.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>Responsable del tratamiento:</strong>
                  <br />
                  Alberto Carrasco Hernández
                  <br />
                  E2D - Evolve2Digital
                  <br />
                  Email: hello@evolve2digital.com
                  <br />
                  Teléfono: +34 123 456 789
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">{t("sections.dataCollection.title")}</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Recopilamos los siguientes tipos de información:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>
                    <strong>Información de contacto:</strong> Nombre, email, teléfono cuando nos contacta
                  </li>
                  <li>
                    <strong>Información técnica:</strong> Dirección IP, tipo de navegador, páginas visitadas
                  </li>
                  <li>
                    <strong>Cookies y tecnologías similares:</strong> Para mejorar la experiencia del usuario
                  </li>
                  <li>
                    <strong>Información de comunicación:</strong> Mensajes enviados a través del chat de IA
                  </li>
                </ul>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">{t("sections.dataUsage.title")}</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">Utilizamos sus datos para:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Proporcionar y mejorar nuestros servicios</li>
                  <li>Responder a sus consultas y solicitudes</li>
                  <li>Enviar información relevante sobre nuestros servicios</li>
                  <li>Cumplir con obligaciones legales</li>
                  <li>Analizar el uso del sitio web para mejoras</li>
                </ul>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">{t("sections.legalBasis.title")}</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">El tratamiento de sus datos se basa en:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>
                    <strong>Consentimiento:</strong> Para cookies no esenciales y marketing
                  </li>
                  <li>
                    <strong>Interés legítimo:</strong> Para análisis y mejora de servicios
                  </li>
                  <li>
                    <strong>Ejecución contractual:</strong> Para proporcionar servicios solicitados
                  </li>
                  <li>
                    <strong>Cumplimiento legal:</strong> Para obligaciones fiscales y legales
                  </li>
                </ul>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">{t("sections.cookies.title")}</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">Utilizamos diferentes tipos de cookies:</p>
                <div className="space-y-4">
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Cookies Necesarias</h3>
                    <p className="text-sm text-muted-foreground">
                      Esenciales para el funcionamiento del sitio web. No se pueden desactivar.
                    </p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Cookies Analíticas</h3>
                    <p className="text-sm text-muted-foreground">
                      Nos ayudan a entender cómo los visitantes interactúan con el sitio web.
                    </p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Cookies de Marketing</h3>
                    <p className="text-sm text-muted-foreground">
                      Utilizadas para mostrar anuncios relevantes y medir la efectividad de campañas.
                    </p>
                  </div>
                </div>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">{t("sections.rights.title")}</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Bajo el GDPR, usted tiene los siguientes derechos:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>
                    <strong>Derecho de acceso:</strong> Solicitar información sobre sus datos
                  </li>
                  <li>
                    <strong>Derecho de rectificación:</strong> Corregir datos inexactos
                  </li>
                  <li>
                    <strong>Derecho de supresión:</strong> Solicitar la eliminación de sus datos
                  </li>
                  <li>
                    <strong>Derecho de portabilidad:</strong> Recibir sus datos en formato estructurado
                  </li>
                  <li>
                    <strong>Derecho de oposición:</strong> Oponerse al tratamiento de sus datos
                  </li>
                  <li>
                    <strong>Derecho de limitación:</strong> Restringir el procesamiento
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Para ejercer estos derechos, contacte con nosotros en: alberto@evolve2digital.com
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">{t("sections.security.title")}</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Implementamos medidas técnicas y organizativas apropiadas para proteger sus datos personales contra el
                  acceso no autorizado, alteración, divulgación o destrucción. Esto incluye cifrado, controles de acceso
                  y auditorías regulares de seguridad.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">{t("sections.contact.title")}</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Si tiene preguntas sobre esta política de privacidad o el tratamiento de sus datos, puede contactarnos
                  en:
                </p>
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p>
                    <strong>Email:</strong> alberto@evolve2digital.com
                  </p>
                  <p>
                    <strong>Teléfono:</strong> +34 123 456 789
                  </p>
                  <p>
                    <strong>Dirección:</strong> Madrid, España
                  </p>
                </div>
              </section>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
