import type { LegalDocument } from "@/lib/legal/types"
import { mailto } from "../shared"

// Reproducción VERBATIM del texto español de app/[locale]/legal/LegalClientPage.tsx.
export const legalNoticeEs: LegalDocument = {
  title: "Aviso Legal",
  lastUpdatedLabel: "Última actualización",
  lastUpdated: "26 de septiembre de 2025",
  sections: [
    {
      id: "general-info",
      title: "Información General",
      blocks: [
        {
          kind: "paragraph",
          text: "En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico, se informa de los siguientes datos:",
        },
        {
          kind: "infoBox",
          rows: [
            { label: "Denominación social", value: "Alberto Carrasco" },
            { label: "Nombre comercial", value: "E2D - Evolve2Digital" },
            { label: "NIF", value: "51095475D" },
            { label: "Domicilio", value: "Madrid, España" },
            { label: "Email", value: [mailto()] },
            { label: "Teléfono", value: "605497639" },
          ],
        },
      ],
    },
    {
      id: "purpose",
      title: "Objeto",
      blocks: [
        {
          kind: "paragraph",
          text: "El presente aviso legal regula el uso del sitio web evolve2digital.com, del que es titular Alberto Carrasco. La navegación por el sitio web atribuye la condición de usuario del mismo e implica la aceptación plena y sin reservas de todas las disposiciones incluidas en este aviso legal.",
        },
      ],
    },
    {
      id: "terms-of-use",
      title: "Condiciones de Uso",
      blocks: [
        {
          kind: "list",
          items: [
            { text: "El acceso a este sitio web es responsabilidad exclusiva de los usuarios" },
            { text: "El uso del sitio web implica el conocimiento y aceptación de las advertencias legales" },
            { text: "El usuario se compromete a hacer un uso adecuado de los contenidos y servicios" },
            { text: "Queda prohibido utilizar el sitio web para actividades ilícitas o lesivas" },
          ],
        },
      ],
    },
    {
      id: "intellectual-property",
      title: "Propiedad Intelectual",
      blocks: [
        {
          kind: "paragraph",
          text: "Todos los contenidos del sitio web, incluyendo textos, fotografías, gráficos, imágenes, iconos, tecnología, software, así como su diseño gráfico y códigos fuente, constituyen una obra cuya propiedad pertenece a Alberto Carrasco, sin que puedan entenderse cedidos al usuario ninguno de los derechos de explotación sobre los mismos.",
        },
      ],
    },
    {
      id: "liability",
      title: "Limitación de Responsabilidad",
      blocks: [
        { kind: "paragraph", text: "Alberto Carrasco no se hace responsable de:" },
        {
          kind: "list",
          items: [
            { text: "La continuidad y disponibilidad de los contenidos" },
            { text: "La ausencia de errores en dichos contenidos" },
            { text: "La ausencia de virus y/o demás componentes dañinos" },
            { text: "Los daños o perjuicios causados por terceros mediante intromisiones ilegítimas" },
          ],
        },
      ],
    },
    {
      id: "modifications",
      title: "Modificaciones",
      blocks: [
        {
          kind: "paragraph",
          text: "Alberto Carrasco se reserva el derecho de efectuar sin previo aviso las modificaciones que considere oportunas en su portal, pudiendo cambiar, suprimir o añadir tanto los contenidos y servicios que se presten a través de la misma como la forma en la que éstos aparezcan presentados o localizados en su portal.",
        },
      ],
    },
    {
      id: "applicable-law",
      title: "Legislación Aplicable",
      blocks: [
        {
          kind: "paragraph",
          text: "La relación entre Alberto Carrasco y el usuario se regirá por la normativa española vigente y cualquier controversia se someterá a los Juzgados y tribunales de la ciudad de Madrid.",
        },
      ],
    },
  ],
}
