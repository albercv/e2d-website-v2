import { AnnexSection, ANNEX_PARAGRAPH_CLASS } from "./annex-section"

// Text below is a VERBATIM reproduction of the legal source
// (politica-privacidad-anexo.md). Do not paraphrase or reorder.

export function BaseJuridicaSection() {
  return (
    <AnnexSection id="base-juridica" title="Base jurídica">
      <p className={`${ANNEX_PARAGRAPH_CLASS} mb-4`}>
        El interés legítimo de E2D en ofrecer sus servicios profesionales a otras empresas (art. 6.1.f RGPD).
        Hemos ponderado ese interés con sus derechos: tratamos solo datos de negocio que usted ha publicado para
        darse a conocer, en la medida mínima necesaria, los conservamos como máximo 30 días si no le contactamos, y
        no le contactamos sin una revisión humana previa.
      </p>
      <p className={ANNEX_PARAGRAPH_CLASS}>
        Como analizamos muchos negocios y solo contactamos a unos pocos, informar uno a uno a todos exigiría
        contactarlos, que es lo que queremos evitar. Por eso publicamos esta información aquí (art. 14.5.b RGPD).
        Si le contactamos, el propio email le informa del tratamiento.
      </p>
    </AnnexSection>
  )
}

interface RecipientRow {
  recipient: string
  role: string
  purpose: string
}

// Verbatim cell text from the "Destinatarios" table in the legal source.
const RECIPIENT_ROWS: readonly RecipientRow[] = [
  {
    recipient: "Apify",
    role: "Encargado del tratamiento",
    purpose: "Obtener la información pública de las fichas de Google Maps. Sus resultados se borran de Apify en cuanto los recibimos",
  },
  {
    recipient: "Google",
    role: "Encargado del tratamiento",
    purpose: "Medir la web (PageSpeed Insights) y alojar las propuestas, los emails y el registro de bajas (Google Workspace)",
  },
  {
    recipient: "Anthropic, a través de su API (cuando se active esta fase)",
    role: "Encargado del tratamiento, con contrato de encargo y cláusulas contractuales tipo",
    purpose: "Extraer los datos de la web y redactar la propuesta y el email de los pocos negocios seleccionados. Antes de enviarle ningún texto quitamos los emails, teléfonos y documentos de identidad",
  },
  {
    recipient: "Anthropic, a través de la suscripción Claude (cuando se active esta fase)",
    role: "Tercero destinatario, bajo sus condiciones de uso para consumidores y sin contrato de encargo. Con el uso de los datos para mejorar sus modelos desactivado, los conserva 30 días",
    purpose: "Evaluar la calidad visual de la web a partir de capturas de pantalla de la web pública",
  },
] as const

function RecipientsTable() {
  return (
    <div className="not-prose">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="hidden md:table-header-group">
          <tr className="border-b border-border">
            <th scope="col" className="py-2 pr-4 font-semibold">Destinatario</th>
            <th scope="col" className="py-2 pr-4 font-semibold">Papel</th>
            <th scope="col" className="py-2 font-semibold">Para qué</th>
          </tr>
        </thead>
        <tbody>
          {RECIPIENT_ROWS.map((row) => (
            <tr key={row.recipient} className="block md:table-row border-b border-border py-3 md:py-0">
              <th scope="row" className="block md:table-cell py-1 md:py-3 pr-4 font-semibold align-top">
                {row.recipient}
              </th>
              <td className="block md:table-cell py-1 md:py-3 pr-4 text-muted-foreground align-top">
                <span className="md:hidden font-medium text-foreground">Papel: </span>
                {row.role}
              </td>
              <td className="block md:table-cell py-1 md:py-3 text-muted-foreground align-top">
                <span className="md:hidden font-medium text-foreground">Para qué: </span>
                {row.purpose}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DestinatariosSection() {
  return (
    <AnnexSection id="destinatarios" title="Destinatarios">
      <RecipientsTable />
      <p className={`${ANNEX_PARAGRAPH_CLASS} mt-4`}>No cedemos sus datos a nadie más, salvo obligación legal.</p>
    </AnnexSection>
  )
}

export function TransferenciasSection() {
  return (
    <AnnexSection id="transferencias" title="Transferencias internacionales">
      <p className={ANNEX_PARAGRAPH_CLASS}>
        Algunos proveedores tratan datos en Estados Unidos. Google está adherida al Marco de Privacidad de Datos
        UE-EE. UU. y, además, aplica cláusulas contractuales tipo. Apify es una empresa de la Unión Europea
        (República Checa); si su infraestructura trata datos fuera de la UE, lo hace con cláusulas contractuales
        tipo. Con Anthropic, a través de su API, la transferencia se ampara en cláusulas contractuales tipo; a
        través de la suscripción, en las garantías que declara su política de privacidad.
      </p>
    </AnnexSection>
  )
}
