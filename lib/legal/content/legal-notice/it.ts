import type { LegalDocument } from "@/lib/legal/types"
import { mailto } from "../shared"

// Italian translation. Section ids/order/block shapes mirror es.ts exactly —
// see __tests__/lib/legal-content-parity.test.ts. Title matches the existing
// metadata title in app/[locale]/legal/page.tsx ("Avviso Legale").
export const legalNoticeIt: LegalDocument = {
  title: "Avviso Legale",
  lastUpdatedLabel: "Ultimo aggiornamento",
  lastUpdated: "26 settembre 2025",
  notice: "La presente è una traduzione fornita per comodità. In caso di discrepanza, prevale la versione spagnola.",
  sections: [
    {
      id: "general-info",
      title: "Informazioni Generali",
      blocks: [
        {
          kind: "paragraph",
          text: "In adempimento della Legge spagnola 34/2002, dell'11 luglio, sui servizi della società dell'informazione e del commercio elettronico (LSSI-CE), si comunicano i seguenti dati:",
        },
        {
          kind: "infoBox",
          rows: [
            { label: "Denominazione", value: "Alberto Carrasco" },
            { label: "Nome commerciale", value: "E2D - Evolve2Digital" },
            { label: "Codice fiscale spagnolo (NIF)", value: "51095475D" },
            { label: "Domicilio", value: "Madrid, Spagna" },
            { label: "Email", value: [mailto()] },
            { label: "Telefono", value: "605497639" },
          ],
        },
      ],
    },
    {
      id: "purpose",
      title: "Oggetto",
      blocks: [
        {
          kind: "paragraph",
          text: "Il presente avviso legale disciplina l'uso del sito web evolve2digital.com, di cui è titolare Alberto Carrasco. La navigazione sul sito web attribuisce la condizione di utente dello stesso e implica l'accettazione piena e senza riserve di tutte le disposizioni incluse nel presente avviso legale.",
        },
      ],
    },
    {
      id: "terms-of-use",
      title: "Condizioni d'Uso",
      blocks: [
        {
          kind: "list",
          items: [
            { text: "L'accesso a questo sito web è di esclusiva responsabilità degli utenti" },
            { text: "L'uso del sito web implica la conoscenza e l'accettazione degli avvisi legali" },
            { text: "L'utente si impegna a fare un uso adeguato dei contenuti e dei servizi" },
            { text: "È vietato utilizzare il sito web per attività illecite o dannose" },
          ],
        },
      ],
    },
    {
      id: "intellectual-property",
      title: "Proprietà Intellettuale",
      blocks: [
        {
          kind: "paragraph",
          text: "Tutti i contenuti del sito web, inclusi testi, fotografie, grafiche, immagini, icone, tecnologia, software, nonché il suo design grafico e i codici sorgente, costituiscono un'opera la cui proprietà appartiene ad Alberto Carrasco, senza che possa intendersi ceduto all'utente alcuno dei diritti di sfruttamento su di essi.",
        },
      ],
    },
    {
      id: "liability",
      title: "Limitazione di Responsabilità",
      blocks: [
        { kind: "paragraph", text: "Alberto Carrasco non è responsabile di:" },
        {
          kind: "list",
          items: [
            { text: "La continuità e disponibilità dei contenuti" },
            { text: "L'assenza di errori in tali contenuti" },
            { text: "L'assenza di virus e/o altri componenti dannosi" },
            { text: "I danni causati da terzi mediante intrusioni illegittime" },
          ],
        },
      ],
    },
    {
      id: "modifications",
      title: "Modifiche",
      blocks: [
        {
          kind: "paragraph",
          text: "Alberto Carrasco si riserva il diritto di apportare, senza preavviso, le modifiche che ritenga opportune al proprio portale, potendo cambiare, sopprimere o aggiungere sia i contenuti e i servizi offerti attraverso di esso, sia il modo in cui questi vengono presentati o collocati nel portale.",
        },
      ],
    },
    {
      id: "applicable-law",
      title: "Legge Applicabile",
      blocks: [
        {
          kind: "paragraph",
          text: "Il rapporto tra Alberto Carrasco e l'utente sarà disciplinato dalla normativa spagnola vigente e qualsiasi controversia sarà sottoposta ai giudici e tribunali della città di Madrid.",
        },
      ],
    },
  ],
}
