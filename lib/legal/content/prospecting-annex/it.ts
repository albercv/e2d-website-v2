import type { LegalDocument } from "@/lib/legal/types"
import { mailto } from "../shared"

// Italian translation. Section ids/order/block shapes mirror es.ts exactly —
// see __tests__/lib/legal-content-parity.test.ts. GDPR terms follow the
// mandatory glossary from the translation brief (Titolare, Responsabile del
// trattamento, Terzo destinatario, legittimo interesse, art. 6, par. 1, lett.
// f), GDPR, etc.). Formal register ("Lei"/"Suoi") throughout.
export const prospectingAnnexIt: LegalDocument = {
  title: "Prospezione commerciale di aziende e professionisti",
  eyebrow: "Allegato all'informativa sulla privacy",
  backLink: { href: "/it/privacy", text: "← Informativa sulla privacy" },
  lastUpdatedLabel: "Ultimo aggiornamento",
  lastUpdated: "28 settembre 2026",
  notice: "La presente è una traduzione fornita per comodità. In caso di discrepanza, prevale la versione spagnola.",
  sections: [
    {
      id: "intro",
      blocks: [
        {
          kind: "paragraph",
          text: "Evolve2Digital (E2D) offre servizi di automazione e software su misura a piccole e medie imprese. Per individuare le attività a cui questi servizi possono essere utili, analizziamo informazioni pubbliche sulle attività. La presente sezione spiega quali dati trattiamo, per quali finalità e come può opporsi.",
        },
      ],
    },
    {
      id: "responsable",
      title: "Titolare del trattamento",
      blocks: [
        {
          kind: "paragraph",
          text: [
            "Alberto Carrasco, imprenditore individuale con nome commerciale E2D - Evolve2Digital, con codice fiscale spagnolo (NIF) 51095475D e domicilio a Madrid (Spagna). Contatto per qualsiasi questione relativa alla privacy: ",
            mailto(),
            ".",
          ],
        },
      ],
    },
    {
      id: "datos",
      title: "Quali dati trattiamo e da dove provengono",
      blocks: [
        { kind: "paragraph", text: "Trattiamo solo dati aziendali che l'attività stessa ha pubblicato:" },
        {
          kind: "list",
          items: [
            {
              text: "Dalla sua scheda pubblica di Google Maps, ottenuta tramite il fornitore Apify: nome commerciale, categorie, indirizzo, codice postale e comune, telefono pubblicato, sito web, link alla scheda, numero di recensioni, valutazione media, se è chiusa e la data delle recensioni più recenti. Non raccogliamo il testo delle recensioni né alcun dato relativo a chi le ha scritte.",
            },
            {
              text: "Dal sito web dell'attività: misurazioni tecniche (velocità e tecnologie), screenshot, i testi pubblicati, l'email di contatto pubblicata (con la pagina da cui proviene) e i dati delle note legali relativi al titolare e alle dimensioni dell'attività.",
            },
          ],
        },
        {
          kind: "paragraph",
          text: "Non acquistiamo banche dati né cerchiamo dati di persone in altre fonti. Se l'attività appartiene a un imprenditore individuale (autónomo), questi dati aziendali sono suoi dati personali, e la presente sezione si applica a essi.",
        },
      ],
    },
    {
      id: "finalidades",
      title: "Per quali finalità li trattiamo",
      blocks: [
        {
          kind: "list",
          items: [
            {
              label: "Prospezione commerciale:",
              text: "cercare attività attive e indipendenti il cui sito web potrebbe essere migliorato, per offrire loro i nostri servizi di automazione dell'acquisizione clienti, sito web incluso.",
            },
            {
              label: "Valutazione e classificazione automatiche:",
              text: "il nostro sistema valuta automaticamente ogni attività per decidere a chi indirizzare la prospezione. La classifica come catena o attività indipendente, e come attiva o meno in base al numero e alla data delle sue recensioni; successivamente valuta anche la qualità tecnica e visiva del suo sito web e ordina le attività in base all'opportunità di miglioramento. Se l'attività appartiene a un imprenditore individuale, questa valutazione costituisce una profilazione a fini di marketing diretto, e può opporsi a essa in qualsiasi momento (art. 21, par. 2, GDPR), come spiegato più avanti.",
            },
            {
              label: "Contatto:",
              text: "solo a poche attività inviamo un'unica email con una proposta, e ogni invio è revisionato e approvato da una persona. Non effettuiamo follow-up automatici.",
            },
          ],
        },
      ],
    },
    {
      id: "base-juridica",
      title: "Base giuridica",
      blocks: [
        {
          kind: "paragraph",
          text: "Il legittimo interesse di E2D a offrire i propri servizi professionali ad altre imprese (art. 6, par. 1, lett. f), GDPR). Abbiamo ponderato tale interesse con i Suoi diritti: trattiamo solo dati aziendali che Lei ha pubblicato per farsi conoscere, nella misura minima necessaria, li conserviamo per un massimo di 30 giorni se non La contattiamo, e non La contattiamo senza una revisione umana preventiva.",
        },
        {
          kind: "paragraph",
          text: "Poiché analizziamo molte attività e ne contattiamo solo poche, informare singolarmente tutte richiederebbe contattarle, il che è proprio ciò che vogliamo evitare. Per questo pubblichiamo questa informativa qui (art. 14, par. 5, lett. b), GDPR). Se La contattiamo, è la stessa email a informarLa del trattamento.",
        },
      ],
    },
    {
      id: "destinatarios",
      title: "Destinatari",
      blocks: [
        {
          kind: "table",
          columns: ["Destinatario", "Ruolo", "Finalità"],
          rows: [
            {
              header: "Apify",
              cells: [
                "Responsabile del trattamento",
                "Ottenere le informazioni pubbliche dalle schede di Google Maps. I suoi risultati vengono cancellati da Apify non appena li riceviamo",
              ],
            },
            {
              header: "Google",
              cells: [
                "Responsabile del trattamento",
                "Misurare il sito web (PageSpeed Insights) e ospitare le proposte, le email e il registro delle opposizioni (Google Workspace)",
              ],
            },
            {
              header: "Anthropic, tramite la sua API (quando questa fase sarà attivata)",
              cells: [
                "Responsabile del trattamento, con accordo sul trattamento dei dati e clausole contrattuali tipo",
                "Estrarre i dati dal sito web e redigere la proposta e l'email per le poche attività selezionate. Prima di inviare qualsiasi testo ad Anthropic, rimuoviamo email, numeri di telefono e documenti di identità",
              ],
            },
            {
              header: "Anthropic, tramite l'abbonamento Claude (quando questa fase sarà attivata)",
              cells: [
                "Terzo destinatario, secondo le sue condizioni d'uso per i consumatori e senza accordo sul trattamento dei dati. Con l'utilizzo dei dati per migliorare i suoi modelli disattivato, li conserva per 30 giorni",
                "Valutare la qualità visiva del sito web a partire da screenshot pubblici del sito",
              ],
            },
          ],
        },
        { kind: "paragraph", text: "Non cediamo i Suoi dati a nessun altro, salvo obbligo di legge." },
      ],
    },
    {
      id: "transferencias",
      title: "Trasferimenti internazionali",
      blocks: [
        {
          kind: "paragraph",
          text: "Alcuni fornitori trattano dati negli Stati Uniti. Google aderisce all'EU-U.S. Data Privacy Framework e applica inoltre clausole contrattuali tipo. Apify è un'azienda dell'Unione Europea (Repubblica Ceca); se la sua infrastruttura tratta dati al di fuori dell'UE, lo fa con clausole contrattuali tipo. Con Anthropic, tramite la sua API, il trasferimento è basato su clausole contrattuali tipo; tramite l'abbonamento, sulle garanzie dichiarate nella sua informativa sulla privacy.",
        },
      ],
    },
    {
      id: "conservacion",
      title: "Per quanto tempo li conserviamo",
      blocks: [
        {
          kind: "list",
          items: [
            {
              label: "Dati dell'analisi:",
              text: "30 giorni dalla raccolta, dopodiché vengono cancellati. Conserviamo solo statistiche anonime.",
            },
            {
              label: "Se Le abbiamo inviato un'email:",
              text: "il registro minimo dell'invio e della Sua risposta, e la casella di invio, per 12 mesi.",
            },
            { label: "Consultazioni della Lista Robinson (registro spagnolo di opposizione alla pubblicità):", text: "un mese dalla consultazione." },
            {
              label: "Se si oppone:",
              text: "un registro minimo e permanente per non trattare più la Sua attività: l'email e il telefono, conservati solo in forma pseudonimizzata con una chiave (HMAC), oltre all'identificativo della Sua scheda di Google Maps e al dominio del Suo sito web.",
            },
            {
              label: "Copie di backup:",
              text: "7 giorni, e non includono i dati dell'analisi. Su Google Drive, l'amministratore può ripristinare gli elementi cancellati per 25 giorni.",
            },
          ],
        },
      ],
    },
    {
      id: "derechos",
      title: "I Suoi diritti e come esercitarli",
      blocks: [
        {
          kind: "paragraph",
          text: [
            "Può esercitare i diritti di accesso, rettifica, cancellazione, limitazione e opposizione scrivendo a ",
            mailto(),
            ". Indichi il nome della Sua attività e il suo sito web oppure il link alla sua scheda di Google Maps, per permetterci di individuarla.",
          ],
        },
        {
          kind: "list",
          items: [
            {
              id: "oposicion",
              label: "Opposizione (art. 21 GDPR):",
              text: "può opporsi in qualsiasi momento alla prospezione commerciale e alla profilazione a essa collegata, senza bisogno di motivarlo. Interrompiamo il trattamento della Sua attività per tale finalità e la aggiungiamo alla nostra lista di esclusione permanente, in modo che non venga più analizzata né riceva comunicazioni.",
            },
            {
              label: "Cancellazione (art. 17 GDPR):",
              text: "cancelliamo i dati della Sua attività dalle analisi in corso e conserviamo solo il registro minimo di esclusione, per non trattarla di nuovo.",
            },
          ],
        },
        {
          kind: "paragraph",
          text: [
            "Se ritiene che non abbiamo gestito correttamente la Sua richiesta, può presentare un reclamo all'Autorità spagnola per la protezione dei dati (Agencia Española de Protección de Datos, AEPD; ",
            { link: "www.aepd.es", href: "https://www.aepd.es", external: true },
            ").",
          ],
        },
      ],
    },
  ],
}
