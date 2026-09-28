import type { LegalDocument } from "@/lib/legal/types"
import { mailto } from "../shared"

// Italian translation. Section ids/order/block shapes mirror es.ts exactly —
// see __tests__/lib/legal-content-parity.test.ts. Title matches the existing
// metadata title in app/[locale]/cookies/page.tsx ("Informativa sui Cookie").
export const cookiesIt: LegalDocument = {
  title: "Informativa sui Cookie",
  lastUpdatedLabel: "Ultimo aggiornamento",
  lastUpdated: "26 settembre 2025",
  notice: "La presente è una traduzione fornita per comodità. In caso di discrepanza, prevale la versione spagnola.",
  sections: [
    {
      id: "what-are-cookies",
      title: "Cosa sono i cookie?",
      blocks: [
        {
          kind: "paragraph",
          text: "I cookie sono piccoli file di testo che vengono memorizzati sul Suo dispositivo quando visita un sito web. Ci aiutano a migliorare la Sua esperienza di navigazione, ricordare le Sue preferenze e analizzare come utilizza il nostro sito web.",
        },
      ],
    },
    {
      id: "cookie-types",
      title: "Tipi di cookie che utilizziamo",
      blocks: [
        {
          kind: "cards",
          items: [
            {
              title: "Cookie essenziali",
              text: "Questi cookie sono necessari per il funzionamento di base del sito web e non possono essere disattivati. Includono cookie di sessione, preferenze linguistiche e impostazioni di sicurezza.",
            },
            {
              title: "Cookie di analisi",
              text: "Utilizziamo cookie di analisi per capire come i visitatori interagiscono con il nostro sito web. Questo ci aiuta a migliorare la funzionalità e i contenuti del sito.",
            },
            {
              title: "Cookie di funzionalità",
              text: "Questi cookie consentono al sito web di ricordare le scelte effettuate (come il nome utente, la lingua o la regione) e offrono funzionalità avanzate e più personali.",
            },
          ],
        },
      ],
    },
    {
      id: "cookie-management",
      title: "Gestione dei cookie",
      blocks: [
        {
          kind: "paragraph",
          text: "Può controllare e/o eliminare i cookie come preferisce. Può eliminare tutti i cookie già presenti sul Suo computer e può configurare la maggior parte dei browser per impedirne l'inserimento.",
        },
        { kind: "paragraph", text: "Per gestire i cookie nei browser più diffusi:" },
        {
          kind: "list",
          items: [
            { label: "Chrome:", text: "Impostazioni → Privacy e sicurezza → Cookie" },
            { label: "Firefox:", text: "Impostazioni → Privacy e sicurezza → Cookie" },
            { label: "Safari:", text: "Preferenze → Privacy → Cookie" },
            { label: "Edge:", text: "Impostazioni → Privacy, ricerca e servizi → Cookie" },
          ],
        },
      ],
    },
    {
      id: "third-party-cookies",
      title: "Cookie di terze parti",
      blocks: [
        {
          kind: "paragraph",
          text: "Alcuni dei nostri partner potrebbero inserire cookie sul Suo dispositivo quando visita il nostro sito. Questi cookie sono soggetti alle informative sulla privacy di tali terze parti.",
        },
      ],
    },
    {
      id: "policy-updates",
      title: "Aggiornamenti di questa informativa",
      blocks: [
        {
          kind: "paragraph",
          text: "Potremmo aggiornare periodicamente la presente informativa sui cookie. Le consigliamo di consultare questa pagina periodicamente per essere informato di eventuali modifiche.",
        },
      ],
    },
    {
      id: "contact",
      title: "Contatto",
      blocks: [
        { kind: "paragraph", text: "Per qualsiasi domanda sulla nostra informativa sui cookie, può contattarci:" },
        {
          kind: "infoBox",
          rows: [
            { label: "Email", value: [mailto()] },
            { label: "Titolare", value: "Alberto Carrasco" },
            { label: "Azienda", value: "E2D - Evolve2Digital" },
          ],
        },
      ],
    },
  ],
}
