import type { LegalDocument } from "@/lib/legal/types"
import { mailto } from "../shared"

// Reproducción VERBATIM del texto español de components/legal/prospecting-annex/*
// y app/[locale]/privacy/prospeccion/page.tsx. No parafrasear ni reordenar.
export const prospectingAnnexEs: LegalDocument = {
  title: "Prospección comercial de empresas y profesionales",
  eyebrow: "Anexo a la política de privacidad",
  backLink: { href: "/es/privacy", text: "← Política de privacidad" },
  lastUpdatedLabel: "Última actualización",
  lastUpdated: "28 de septiembre de 2026",
  sections: [
    {
      id: "intro",
      blocks: [
        {
          kind: "paragraph",
          text: "Evolve2Digital (E2D) ofrece servicios de automatización y software a medida a pequeñas y medianas empresas. Para encontrar negocios a los que esos servicios les pueden ser útiles, analizamos información pública de negocios. Este apartado explica qué datos tratamos, para qué y cómo puede oponerse.",
        },
      ],
    },
    {
      id: "responsable",
      title: "Responsable",
      blocks: [
        {
          kind: "paragraph",
          text: [
            "Alberto Carrasco, empresario individual con nombre comercial E2D - Evolve2Digital, con NIF 51095475D y domicilio en Madrid (España). Contacto para cualquier cuestión de privacidad: ",
            mailto(),
            ".",
          ],
        },
      ],
    },
    {
      id: "datos",
      title: "Qué datos tratamos y de dónde salen",
      blocks: [
        { kind: "paragraph", text: "Solo tratamos datos de negocio que el propio negocio ha publicado:" },
        {
          kind: "list",
          items: [
            {
              text: "De su ficha pública de Google Maps, obtenida mediante el proveedor Apify: nombre comercial, categorías, dirección, código postal y municipio, teléfono publicado, web, enlace a la ficha, número de reseñas, valoración media, si está cerrado y la fecha de sus reseñas más recientes. No recogemos el texto de las reseñas ni ningún dato de quienes las escriben.",
            },
            {
              text: "De la web del negocio: mediciones técnicas (velocidad y tecnologías), capturas de pantalla, los textos publicados, el email de contacto publicado (con la página de la que sale) y los datos de su aviso legal sobre el titular y el tamaño del negocio.",
            },
          ],
        },
        {
          kind: "paragraph",
          text: "No compramos bases de datos ni buscamos datos de personas en otras fuentes. Si el negocio es de un empresario individual (autónomo), estos datos de negocio son datos personales suyos, y este apartado se aplica a ellos.",
        },
      ],
    },
    {
      id: "finalidades",
      title: "Para qué los tratamos",
      blocks: [
        {
          kind: "list",
          items: [
            {
              label: "Prospección comercial:",
              text: "buscar negocios activos e independientes cuya web se puede mejorar, para ofrecerles nuestros servicios de automatización de la captación de clientes, con la web incluida.",
            },
            {
              label: "Evaluación y clasificación automáticas:",
              text: "nuestro sistema evalúa cada negocio de forma automática para decidir a quién dirigimos la prospección. Lo clasifica como cadena o negocio independiente, y como activo o no según el número y la fecha de sus reseñas; más adelante también valora la calidad técnica y visual de su web y ordena los negocios por la oportunidad de mejora. Si el negocio es de un empresario individual, esta evaluación es una elaboración de perfiles con fines de mercadotecnia directa, y puede oponerse a ella en cualquier momento (art. 21.2 RGPD), como se explica más abajo.",
            },
            {
              label: "Contacto:",
              text: "solo a unos pocos negocios les enviamos un único email con una propuesta, y cada envío lo revisa y aprueba una persona. No hacemos seguimientos automáticos.",
            },
          ],
        },
      ],
    },
    {
      id: "base-juridica",
      title: "Base jurídica",
      blocks: [
        {
          kind: "paragraph",
          text: "El interés legítimo de E2D en ofrecer sus servicios profesionales a otras empresas (art. 6.1.f RGPD). Hemos ponderado ese interés con sus derechos: tratamos solo datos de negocio que usted ha publicado para darse a conocer, en la medida mínima necesaria, los conservamos como máximo 30 días si no le contactamos, y no le contactamos sin una revisión humana previa.",
        },
        {
          kind: "paragraph",
          text: "Como analizamos muchos negocios y solo contactamos a unos pocos, informar uno a uno a todos exigiría contactarlos, que es lo que queremos evitar. Por eso publicamos esta información aquí (art. 14.5.b RGPD). Si le contactamos, el propio email le informa del tratamiento.",
        },
      ],
    },
    {
      id: "destinatarios",
      title: "Destinatarios",
      blocks: [
        {
          kind: "table",
          columns: ["Destinatario", "Papel", "Para qué"],
          rows: [
            {
              header: "Apify",
              cells: [
                "Encargado del tratamiento",
                "Obtener la información pública de las fichas de Google Maps. Sus resultados se borran de Apify en cuanto los recibimos",
              ],
            },
            {
              header: "Google",
              cells: [
                "Encargado del tratamiento",
                "Medir la web (PageSpeed Insights) y alojar las propuestas, los emails y el registro de bajas (Google Workspace)",
              ],
            },
            {
              header: "Anthropic, a través de su API (cuando se active esta fase)",
              cells: [
                "Encargado del tratamiento, con contrato de encargo y cláusulas contractuales tipo",
                "Extraer los datos de la web y redactar la propuesta y el email de los pocos negocios seleccionados. Antes de enviarle ningún texto quitamos los emails, teléfonos y documentos de identidad",
              ],
            },
            {
              header: "Anthropic, a través de la suscripción Claude (cuando se active esta fase)",
              cells: [
                "Tercero destinatario, bajo sus condiciones de uso para consumidores y sin contrato de encargo. Con el uso de los datos para mejorar sus modelos desactivado, los conserva 30 días",
                "Evaluar la calidad visual de la web a partir de capturas de pantalla de la web pública",
              ],
            },
          ],
        },
        { kind: "paragraph", text: "No cedemos sus datos a nadie más, salvo obligación legal." },
      ],
    },
    {
      id: "transferencias",
      title: "Transferencias internacionales",
      blocks: [
        {
          kind: "paragraph",
          text: "Algunos proveedores tratan datos en Estados Unidos. Google está adherida al Marco de Privacidad de Datos UE-EE. UU. y, además, aplica cláusulas contractuales tipo. Apify es una empresa de la Unión Europea (República Checa); si su infraestructura trata datos fuera de la UE, lo hace con cláusulas contractuales tipo. Con Anthropic, a través de su API, la transferencia se ampara en cláusulas contractuales tipo; a través de la suscripción, en las garantías que declara su política de privacidad.",
        },
      ],
    },
    {
      id: "conservacion",
      title: "Cuánto tiempo los conservamos",
      blocks: [
        {
          kind: "list",
          items: [
            {
              label: "Datos del análisis:",
              text: "30 días desde que los recogemos, y después se borran. Solo conservamos estadísticas anónimas.",
            },
            {
              label: "Si le hemos enviado un email:",
              text: "el registro mínimo del envío y de su respuesta, y el buzón de envío, 12 meses.",
            },
            { label: "Consultas a la Lista Robinson:", text: "un mes desde la consulta." },
            {
              label: "Si se opone:",
              text: "un registro mínimo, permanente, para no volver a tratar su negocio: el email y el teléfono solo seudonimizados con una clave (HMAC), y además el identificador de su ficha de Google Maps y el dominio de su web.",
            },
            {
              label: "Copias de seguridad:",
              text: "7 días, y no incluyen los datos del análisis. En Google Drive, el administrador puede restaurar lo borrado durante 25 días.",
            },
          ],
        },
      ],
    },
    {
      id: "derechos",
      title: "Sus derechos y cómo ejercerlos",
      blocks: [
        {
          kind: "paragraph",
          text: [
            "Puede ejercer los derechos de acceso, rectificación, supresión, limitación y oposición escribiendo a ",
            mailto(),
            ". Indique el nombre de su negocio y su web o el enlace a su ficha de Google Maps, para que podamos localizarlo.",
          ],
        },
        {
          kind: "list",
          items: [
            {
              id: "oposicion",
              label: "Oposición (art. 21 RGPD):",
              text: "puede oponerse en cualquier momento a la prospección comercial y a la elaboración de perfiles relacionada con ella, sin necesidad de justificarlo. Dejamos de tratar su negocio para ese fin y lo añadimos a nuestra lista de supresión permanente, de modo que no vuelva a analizarse ni a recibir comunicaciones.",
            },
            {
              label: "Supresión (art. 17 RGPD):",
              text: "borramos los datos de su negocio de los análisis en curso y guardamos solo el registro mínimo de supresión, para no volver a tratarlo.",
            },
          ],
        },
        {
          kind: "paragraph",
          text: [
            "Si considera que no hemos atendido bien su solicitud, puede presentar una reclamación ante la Agencia Española de Protección de Datos (",
            { link: "www.aepd.es", href: "https://www.aepd.es", external: true },
            ").",
          ],
        },
      ],
    },
  ],
}
