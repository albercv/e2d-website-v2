import type { LegalDocument } from "@/lib/legal/types"
import { mailto } from "../shared"

// Italian translation. Section ids/order/block shapes mirror es.ts exactly —
// see __tests__/lib/legal-content-parity.test.ts. Formal "Lei" register
// throughout, matching the Spanish "usted" of the rest of the site's legal pages.
export const privacyIt: LegalDocument = {
  title: "Informativa sulla Privacy",
  lastUpdatedLabel: "Ultimo aggiornamento",
  lastUpdated: "28 settembre 2026",
  notice: "La presente è una traduzione fornita per comodità. In caso di discrepanza, prevale la versione spagnola.",
  sections: [
    {
      id: "introduction",
      title: "Introduzione",
      blocks: [
        {
          kind: "paragraph",
          text: "In E2D (Evolve2Digital), rispettiamo la Sua privacy e ci impegniamo a proteggere i Suoi dati personali. La presente informativa sulla privacy spiega come raccogliamo, utilizziamo e proteggiamo le Sue informazioni quando utilizza i nostri servizi.",
        },
        {
          kind: "lines",
          lines: [
            [{ strong: "Titolare del trattamento:" }],
            "Alberto Carrasco",
            "E2D - Evolve2Digital",
            ["Email: ", mailto()],
            "Telefono: 605497639",
          ],
        },
      ],
    },
    {
      id: "data-collection",
      title: "Raccolta Dati",
      blocks: [
        { kind: "paragraph", text: "Raccogliamo i seguenti tipi di informazioni:" },
        {
          kind: "list",
          items: [
            { label: "Informazioni di contatto:", text: "Nome, email, telefono quando ci contatta" },
            { label: "Informazioni tecniche:", text: "Indirizzo IP, tipo di browser, pagine visitate" },
            { label: "Cookie e tecnologie simili:", text: "Per migliorare l'esperienza dell'utente" },
            { label: "Informazioni di comunicazione:", text: "Messaggi inviati tramite la chat IA" },
          ],
        },
      ],
    },
    {
      id: "data-usage",
      title: "Uso dei Dati",
      blocks: [
        { kind: "paragraph", text: "Utilizziamo i Suoi dati per:" },
        {
          kind: "list",
          items: [
            { text: "Fornire e migliorare i nostri servizi" },
            { text: "Rispondere alle Sue richieste e domande" },
            { text: "Inviare informazioni rilevanti sui nostri servizi" },
            { text: "Adempiere agli obblighi legali" },
            { text: "Analizzare l'utilizzo del sito web per migliorarlo" },
          ],
        },
      ],
    },
    {
      id: "legal-basis",
      title: "Base Giuridica",
      blocks: [
        { kind: "paragraph", text: "Il trattamento dei Suoi dati si basa su:" },
        {
          kind: "list",
          items: [
            { label: "Consenso:", text: "Per i cookie non essenziali e il marketing" },
            { label: "Legittimo interesse:", text: "Per l'analisi e il miglioramento dei servizi" },
            { label: "Esecuzione contrattuale:", text: "Per fornire i servizi richiesti" },
            { label: "Obbligo legale:", text: "Per obblighi fiscali e legali" },
          ],
        },
      ],
    },
    {
      id: "cookies",
      title: "Politica Cookie",
      blocks: [
        { kind: "paragraph", text: "Utilizziamo diversi tipi di cookie:" },
        {
          kind: "cards",
          items: [
            {
              title: "Cookie Necessari",
              text: "Essenziali per il funzionamento del sito web. Non possono essere disattivati.",
            },
            {
              title: "Cookie Analitici",
              text: "Ci aiutano a capire come i visitatori interagiscono con il sito web.",
            },
            {
              title: "Cookie di Marketing",
              text: "Utilizzati per mostrare annunci pertinenti e misurare l'efficacia delle campagne.",
            },
          ],
        },
      ],
    },
    {
      id: "rights",
      title: "I Suoi Diritti",
      blocks: [
        { kind: "paragraph", text: "Ai sensi del GDPR, Lei ha i seguenti diritti:" },
        {
          kind: "list",
          items: [
            { label: "Diritto di accesso:", text: "Richiedere informazioni sui Suoi dati" },
            { label: "Diritto di rettifica:", text: "Correggere dati inesatti" },
            { label: "Diritto di cancellazione:", text: "Richiedere la cancellazione dei Suoi dati" },
            { label: "Diritto alla portabilità:", text: "Ricevere i Suoi dati in un formato strutturato" },
            { label: "Diritto di opposizione:", text: "Opporsi al trattamento dei Suoi dati" },
            { label: "Diritto di limitazione:", text: "Limitare il trattamento" },
          ],
        },
        { kind: "paragraph", text: ["Per esercitare questi diritti, ci contatti all'indirizzo: ", mailto()] },
      ],
    },
    {
      id: "security",
      title: "Sicurezza",
      blocks: [
        {
          kind: "paragraph",
          text: "Adottiamo misure tecniche e organizzative adeguate per proteggere i Suoi dati personali da accessi non autorizzati, alterazione, divulgazione o distruzione. Questo include crittografia, controlli di accesso e controlli di sicurezza periodici.",
        },
      ],
    },
    {
      id: "contact",
      title: "Contatto",
      blocks: [
        {
          kind: "paragraph",
          text: "Se ha domande sulla presente informativa sulla privacy o sul trattamento dei Suoi dati, può contattarci a:",
        },
        {
          kind: "infoBox",
          rows: [
            { label: "Email", value: [mailto()] },
            { label: "Telefono", value: "605497639" },
            { label: "Indirizzo", value: "Madrid, Spagna" },
          ],
        },
      ],
    },
    {
      id: "ai-chat",
      title: "Assistente IA",
      blocks: [
        {
          kind: "paragraph",
          text: "Se interagisce con l'assistente IA, i Suoi messaggi vengono inviati a DeepSeek (LLM) e le query di ricerca sono vettorializzate con embedding di OpenAI per individuare contenuti rilevanti dalla nostra base di conoscenza. Conserviamo le conversazioni per 90 giorni, dopo i quali vengono eliminate automaticamente. I dati di contatto che decide di condividere sono conservati come record commerciale.",
        },
      ],
    },
    {
      id: "prospeccion",
      title: "Prospezione commerciale",
      blocks: [
        {
          kind: "paragraph",
          text: [
            "Se abbiamo analizzato la Sua attività o L'abbiamo contattata nell'ambito della nostra prospezione commerciale di aziende e professionisti, le informazioni specifiche su questo trattamento si trovano nel relativo allegato. ",
            { link: "Leggi l'allegato sulla prospezione.", href: "/it/privacy/prospeccion" },
          ],
        },
      ],
    },
  ],
}
