import type { LegalDocument } from "@/lib/legal/types"
import { mailto } from "../shared"

// Reproducción VERBATIM del texto español de app/[locale]/privacy/privacy-client.tsx
// y de messages/es.json (namespace "privacy"). No parafrasear ni reordenar.
export const privacyEs: LegalDocument = {
  title: "Política de Privacidad",
  lastUpdatedLabel: "Última actualización",
  lastUpdated: "28 de septiembre de 2026",
  sections: [
    {
      id: "introduction",
      title: "Introducción",
      blocks: [
        {
          kind: "paragraph",
          text: "En E2D (Evolve2Digital), respetamos su privacidad y nos comprometemos a proteger sus datos personales. Esta política de privacidad explica cómo recopilamos, utilizamos y protegemos su información cuando utiliza nuestros servicios.",
        },
        {
          kind: "lines",
          lines: [
            [{ strong: "Responsable del tratamiento:" }],
            "Alberto Carrasco",
            "E2D - Evolve2Digital",
            ["Email: ", mailto()],
            "Teléfono: 605497639",
          ],
        },
      ],
    },
    {
      id: "data-collection",
      title: "Recopilación de Datos",
      blocks: [
        { kind: "paragraph", text: "Recopilamos los siguientes tipos de información:" },
        {
          kind: "list",
          items: [
            { label: "Información de contacto:", text: "Nombre, email, teléfono cuando nos contacta" },
            { label: "Información técnica:", text: "Dirección IP, tipo de navegador, páginas visitadas" },
            { label: "Cookies y tecnologías similares:", text: "Para mejorar la experiencia del usuario" },
            { label: "Información de comunicación:", text: "Mensajes enviados a través del chat de IA" },
          ],
        },
      ],
    },
    {
      id: "data-usage",
      title: "Uso de Datos",
      blocks: [
        { kind: "paragraph", text: "Utilizamos sus datos para:" },
        {
          kind: "list",
          items: [
            { text: "Proporcionar y mejorar nuestros servicios" },
            { text: "Responder a sus consultas y solicitudes" },
            { text: "Enviar información relevante sobre nuestros servicios" },
            { text: "Cumplir con obligaciones legales" },
            { text: "Analizar el uso del sitio web para mejoras" },
          ],
        },
      ],
    },
    {
      id: "legal-basis",
      title: "Base Legal",
      blocks: [
        { kind: "paragraph", text: "El tratamiento de sus datos se basa en:" },
        {
          kind: "list",
          items: [
            { label: "Consentimiento:", text: "Para cookies no esenciales y marketing" },
            { label: "Interés legítimo:", text: "Para análisis y mejora de servicios" },
            { label: "Ejecución contractual:", text: "Para proporcionar servicios solicitados" },
            { label: "Cumplimiento legal:", text: "Para obligaciones fiscales y legales" },
          ],
        },
      ],
    },
    {
      id: "cookies",
      title: "Política de Cookies",
      blocks: [
        { kind: "paragraph", text: "Utilizamos diferentes tipos de cookies:" },
        {
          kind: "cards",
          items: [
            {
              title: "Cookies Necesarias",
              text: "Esenciales para el funcionamiento del sitio web. No se pueden desactivar.",
            },
            {
              title: "Cookies Analíticas",
              text: "Nos ayudan a entender cómo los visitantes interactúan con el sitio web.",
            },
            {
              title: "Cookies de Marketing",
              text: "Utilizadas para mostrar anuncios relevantes y medir la efectividad de campañas.",
            },
          ],
        },
      ],
    },
    {
      id: "rights",
      title: "Sus Derechos",
      blocks: [
        { kind: "paragraph", text: "Bajo el GDPR, usted tiene los siguientes derechos:" },
        {
          kind: "list",
          items: [
            { label: "Derecho de acceso:", text: "Solicitar información sobre sus datos" },
            { label: "Derecho de rectificación:", text: "Corregir datos inexactos" },
            { label: "Derecho de supresión:", text: "Solicitar la eliminación de sus datos" },
            { label: "Derecho de portabilidad:", text: "Recibir sus datos en formato estructurado" },
            { label: "Derecho de oposición:", text: "Oponerse al tratamiento de sus datos" },
            { label: "Derecho de limitación:", text: "Restringir el procesamiento" },
          ],
        },
        { kind: "paragraph", text: ["Para ejercer estos derechos, contacte con nosotros en: ", mailto()] },
      ],
    },
    {
      id: "security",
      title: "Seguridad",
      blocks: [
        {
          kind: "paragraph",
          text: "Implementamos medidas técnicas y organizativas apropiadas para proteger sus datos personales contra el acceso no autorizado, alteración, divulgación o destrucción. Esto incluye cifrado, controles de acceso y auditorías regulares de seguridad.",
        },
      ],
    },
    {
      id: "contact",
      title: "Contacto",
      blocks: [
        {
          kind: "paragraph",
          text: "Si tiene preguntas sobre esta política de privacidad o el tratamiento de sus datos, puede contactarnos en:",
        },
        {
          kind: "infoBox",
          rows: [
            { label: "Email", value: [mailto()] },
            { label: "Teléfono", value: "605497639" },
            { label: "Dirección", value: "Madrid, España" },
          ],
        },
      ],
    },
    {
      id: "ai-chat",
      title: "Asistente de IA",
      blocks: [
        {
          kind: "paragraph",
          text: "Si interactúas con el asistente IA, tus mensajes se envían a DeepSeek (LLM) y las consultas de búsqueda se vectorizan con embeddings de OpenAI para localizar contenido relevante de nuestra base de conocimiento. Conservamos las conversaciones durante 90 días y después se eliminan automáticamente. Los datos de contacto que decidas compartir se guardan como registro comercial.",
        },
      ],
    },
    {
      id: "prospeccion",
      title: "Prospección comercial",
      blocks: [
        {
          kind: "paragraph",
          text: [
            "Si hemos analizado su negocio o le hemos contactado dentro de nuestra prospección comercial de empresas y profesionales, la información específica sobre ese tratamiento está en su anexo. ",
            { link: "Ver el anexo de prospección comercial.", href: "/es/privacy/prospeccion" },
          ],
        },
      ],
    },
  ],
}
