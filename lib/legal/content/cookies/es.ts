import type { LegalDocument } from "@/lib/legal/types"
import { mailto } from "../shared"

// Reproducción VERBATIM del texto español de app/[locale]/cookies/CookiesClientPage.tsx.
export const cookiesEs: LegalDocument = {
  title: "Política de Cookies",
  lastUpdatedLabel: "Última actualización",
  lastUpdated: "26 de septiembre de 2025",
  sections: [
    {
      id: "what-are-cookies",
      title: "¿Qué son las cookies?",
      blocks: [
        {
          kind: "paragraph",
          text: "Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web. Nos ayudan a mejorar su experiencia de navegación, recordar sus preferencias y analizar cómo utiliza nuestro sitio web.",
        },
      ],
    },
    {
      id: "cookie-types",
      title: "Tipos de cookies que utilizamos",
      blocks: [
        {
          kind: "cards",
          items: [
            {
              title: "Cookies esenciales",
              text: "Estas cookies son necesarias para el funcionamiento básico del sitio web y no se pueden desactivar. Incluyen cookies de sesión, preferencias de idioma y configuraciones de seguridad.",
            },
            {
              title: "Cookies de análisis",
              text: "Utilizamos cookies de análisis para entender cómo los visitantes interactúan con nuestro sitio web. Esto nos ayuda a mejorar la funcionalidad y el contenido del sitio.",
            },
            {
              title: "Cookies de funcionalidad",
              text: "Estas cookies permiten que el sitio web recuerde las opciones que hace (como su nombre de usuario, idioma o región) y proporcionan características mejoradas y más personales.",
            },
          ],
        },
      ],
    },
    {
      id: "cookie-management",
      title: "Gestión de cookies",
      blocks: [
        {
          kind: "paragraph",
          text: "Puede controlar y/o eliminar las cookies como desee. Puede eliminar todas las cookies que ya están en su ordenador y puede configurar la mayoría de navegadores para evitar que se coloquen.",
        },
        { kind: "paragraph", text: "Para gestionar las cookies en los navegadores más populares:" },
        {
          kind: "list",
          items: [
            { label: "Chrome:", text: "Configuración → Privacidad y seguridad → Cookies" },
            { label: "Firefox:", text: "Preferencias → Privacidad y seguridad → Cookies" },
            { label: "Safari:", text: "Preferencias → Privacidad → Cookies" },
            { label: "Edge:", text: "Configuración → Privacidad → Cookies" },
          ],
        },
      ],
    },
    {
      id: "third-party-cookies",
      title: "Cookies de terceros",
      blocks: [
        {
          kind: "paragraph",
          text: "Algunos de nuestros socios pueden colocar cookies en su dispositivo cuando visita nuestro sitio. Estas cookies están sujetas a las políticas de privacidad de dichos terceros.",
        },
      ],
    },
    {
      id: "policy-updates",
      title: "Actualizaciones de esta política",
      blocks: [
        {
          kind: "paragraph",
          text: "Podemos actualizar esta política de cookies ocasionalmente. Le recomendamos que revise esta página periódicamente para estar informado de cualquier cambio.",
        },
      ],
    },
    {
      id: "contact",
      title: "Contacto",
      blocks: [
        { kind: "paragraph", text: "Si tiene alguna pregunta sobre nuestra política de cookies, puede contactarnos:" },
        {
          kind: "infoBox",
          rows: [
            { label: "Email", value: [mailto()] },
            { label: "Responsable", value: "Alberto Carrasco" },
            { label: "Empresa", value: "E2D - Evolve2Digital" },
          ],
        },
      ],
    },
  ],
}
