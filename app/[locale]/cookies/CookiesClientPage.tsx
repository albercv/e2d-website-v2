"use client"

import { useTranslations } from "next-intl"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function CookiesClientPage() {
  const t = useTranslations("cookies")

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Política de Cookies</h1>
            <p className="text-muted-foreground text-lg">Última actualización: 26 de septiembre de 2025</p>
          </div>

          <Card className="p-8">
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">¿Qué son las cookies?</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web.
                  Nos ayudan a mejorar su experiencia de navegación, recordar sus preferencias y analizar cómo utiliza
                  nuestro sitio web.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Tipos de cookies que utilizamos</h2>
                
                <div className="space-y-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Cookies esenciales</h3>
                    <p className="text-muted-foreground">
                      Estas cookies son necesarias para el funcionamiento básico del sitio web y no se pueden desactivar.
                      Incluyen cookies de sesión, preferencias de idioma y configuraciones de seguridad.
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Cookies de análisis</h3>
                    <p className="text-muted-foreground">
                      Utilizamos cookies de análisis para entender cómo los visitantes interactúan con nuestro sitio web.
                      Esto nos ayuda a mejorar la funcionalidad y el contenido del sitio.
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Cookies de funcionalidad</h3>
                    <p className="text-muted-foreground">
                      Estas cookies permiten que el sitio web recuerde las opciones que hace (como su nombre de usuario,
                      idioma o región) y proporcionan características mejoradas y más personales.
                    </p>
                  </div>
                </div>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Gestión de cookies</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Puede controlar y/o eliminar las cookies como desee. Puede eliminar todas las cookies que ya están
                  en su ordenador y puede configurar la mayoría de navegadores para evitar que se coloquen.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Para gestionar las cookies en los navegadores más populares:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies</li>
                  <li><strong>Firefox:</strong> Preferencias → Privacidad y seguridad → Cookies</li>
                  <li><strong>Safari:</strong> Preferencias → Privacidad → Cookies</li>
                  <li><strong>Edge:</strong> Configuración → Privacidad → Cookies</li>
                </ul>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Cookies de terceros</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Algunos de nuestros socios pueden colocar cookies en su dispositivo cuando visita nuestro sitio.
                  Estas cookies están sujetas a las políticas de privacidad de dichos terceros.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Actualizaciones de esta política</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Podemos actualizar esta política de cookies ocasionalmente. Le recomendamos que revise esta página
                  periódicamente para estar informado de cualquier cambio.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Contacto</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Si tiene alguna pregunta sobre nuestra política de cookies, puede contactarnos:
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p><strong>Email:</strong> hello@evolve2digital.com</p>
                  <p><strong>Responsable:</strong> Alberto Carrasco</p>
                  <p><strong>Empresa:</strong> E2D - Evolve2Digital</p>
                </div>
              </section>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}