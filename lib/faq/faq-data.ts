export interface FaqItem {
  question: string
  answer: string
}

export interface FaqLocaleData {
  sectionTitle: string
  sectionSubtitle: string
  items: FaqItem[]
}

// Single source for the visible accordion, the FAQPage JSON-LD and the RAG
// index. Answers may only state what Alberto can back up: no third-party
// rankings or prices, and no promises about price, deadlines, ownership or
// support — those are fixed in writing in each proposal.
export const FAQ_DATA: Record<"es" | "en" | "it", FaqLocaleData> = {
  es: {
    sectionTitle: "Preguntas frecuentes",
    sectionSubtitle: "Lo que conviene saber antes de elegir con quién trabajar.",
    items: [
      {
        question: "¿Quién desarrolla mi proyecto?",
        answer:
          "Lo desarrollo yo personalmente: soy Alberto Carrasco, fundador de Evolve2Digital. Diseño, programo y despliego cada proyecto, así que hablas directamente con quien escribe el código. Trabajo con empresas de España y del norte de Europa.",
      },
      {
        question: "¿Puedes integrar mis herramientas actuales?",
        answer:
          "Es posible siempre que la herramienta ofrezca una API, webhooks o alguna forma de exportar los datos. Antes de presupuestar reviso qué ofrece cada una de las herramientas que usas y te explico qué se puede conectar y qué no. Algunos ejemplos de integraciones posibles son CRM, ERP, bases de datos, n8n, pasarelas de pago y WhatsApp.",
      },
      {
        question: "¿Cómo se calcula el presupuesto?",
        answer:
          "Depende del alcance, de las integraciones necesarias, de los datos que haya que tratar y del mantenimiento posterior; por eso no doy cifras genéricas. Cada propuesta fija por escrito el alcance y el presupuesto antes de empezar. Para algunos servicios hay precios de referencia publicados en las páginas de servicios de esta web.",
      },
      {
        question: "¿Qué código y documentación se entregan?",
        answer:
          "Lo que se entrega (por ejemplo, acceso al repositorio, documentación y titularidad del código) depende de cada proyecto y se fija por escrito en la propuesta. Si para ti es importante algún punto en concreto, coméntalo al pedir la propuesta para que quede reflejado en ella.",
      },
      {
        question: "¿Qué mantenimiento necesita la solución?",
        answer:
          "Toda solución en producción necesita mantenimiento: actualizar dependencias, adaptarse a los cambios en las API de terceros (pagos, WhatsApp, modelos de IA, etc.) y comprobar que todo sigue funcionando. Las condiciones de mantenimiento y soporte se acuerdan en cada proyecto y se recogen en la propuesta.",
      },
      {
        question: "¿Dónde puedo ver ejemplos?",
        answer:
          "En la sección de proyectos de esta misma página tienes algunos trabajos para clientes. En mi portfolio, e2dProjects (https://e2dprojects.com/es/), hay más proyectos. Y en el blog cuento el caso de Ferdy: una web a medida con reserva y pago con Stripe, venta y entrega automática de ebooks y correos electrónicos transaccionales automáticos.",
      },
    ],
  },
  en: {
    sectionTitle: "Frequently asked questions",
    sectionSubtitle: "What is worth knowing before choosing who to work with.",
    items: [
      {
        question: "Who develops my project?",
        answer:
          "I do, personally: I'm Alberto Carrasco, founder of Evolve2Digital. I design, code and deploy every project myself, so you talk directly to the person who writes the code. I work with companies in Spain and Northern Europe.",
      },
      {
        question: "Can you integrate my current tools?",
        answer:
          "It is possible whenever the tool offers an API, webhooks or some way to export its data. Before quoting, I review what each of your tools offers and explain what can be connected and what cannot. Examples of possible integrations include CRMs, ERPs, databases, n8n, payment gateways and WhatsApp.",
      },
      {
        question: "How is the budget calculated?",
        answer:
          "It depends on the scope, the integrations required, the data involved and the maintenance afterwards; that is why I don't give generic figures. Each proposal sets the scope and the budget in writing before work starts. For some services, reference prices are published on the service pages of this website (in Spanish).",
      },
      {
        question: "What code and documentation are delivered?",
        answer:
          "What is delivered (for example, repository access, documentation and ownership of the code) depends on each project and is set in writing in the proposal. If a specific point matters to you, mention it when you ask for the proposal so that it is reflected in it.",
      },
      {
        question: "What maintenance does the solution need?",
        answer:
          "Any solution in production needs maintenance: updating dependencies, adapting to changes in third-party APIs (payments, WhatsApp, AI models, etc.) and checking that everything keeps working. Maintenance and support terms are agreed for each project and set out in the proposal.",
      },
      {
        question: "Where can I see examples?",
        answer:
          "The projects section on this very page shows some client work. In my portfolio, e2dProjects (https://e2dprojects.com/en/), there are more projects. And on the blog I tell the story of Ferdy: a custom website with booking and payment through Stripe, automatic ebook sales and delivery, and automatic transactional emails.",
      },
    ],
  },
  it: {
    sectionTitle: "Domande frequenti",
    sectionSubtitle: "Quello che conviene sapere prima di scegliere con chi lavorare.",
    items: [
      {
        question: "Chi sviluppa il mio progetto?",
        answer:
          "Lo sviluppo io, personalmente: sono Alberto Carrasco, fondatore di Evolve2Digital. Progetto, programmo e metto online ogni lavoro in prima persona, quindi parli direttamente con chi scrive il codice. Lavoro con aziende di Spagna e del Nord Europa.",
      },
      {
        question: "Puoi integrare i miei strumenti attuali?",
        answer:
          "È possibile purché lo strumento offra un'API, dei webhook o un modo per esportare i dati. Prima di fare il preventivo controllo cosa offre ciascuno degli strumenti che usi e ti spiego cosa si può collegare e cosa no. Esempi di integrazioni possibili sono CRM, ERP, database, n8n, gateway di pagamento e WhatsApp.",
      },
      {
        question: "Come si calcola il preventivo?",
        answer:
          "Dipende dall'ambito del progetto, dalle integrazioni necessarie, dai dati da trattare e dalla manutenzione successiva; per questo non do cifre generiche. Ogni proposta definisce per iscritto l'ambito e il preventivo prima di iniziare. Per alcuni servizi i prezzi di riferimento sono pubblicati nelle pagine dei servizi di questo sito (in spagnolo).",
      },
      {
        question: "Quale codice e quale documentazione vengono consegnati?",
        answer:
          "Ciò che viene consegnato (ad esempio l'accesso al repository, la documentazione e la titolarità del codice) dipende da ogni progetto e viene definito per iscritto nella proposta. Se per te un punto specifico è importante, indicalo quando richiedi la proposta, così che vi sia riportato.",
      },
      {
        question: "Di quale manutenzione ha bisogno la soluzione?",
        answer:
          "Ogni soluzione in produzione ha bisogno di manutenzione: aggiornare le dipendenze, adattarsi ai cambiamenti delle API di terze parti (pagamenti, WhatsApp, modelli di IA, ecc.) e verificare che tutto continui a funzionare. Le condizioni di manutenzione e supporto si concordano per ogni progetto e sono riportate nella proposta.",
      },
      {
        question: "Dove posso vedere degli esempi?",
        answer:
          "Nella sezione progetti di questa stessa pagina trovi alcuni lavori per clienti. Nel mio portfolio, e2dProjects (https://e2dprojects.com/en/, in inglese), ci sono altri progetti. E nel blog racconto il caso di Ferdy: un sito su misura con prenotazione e pagamento con Stripe, vendita e consegna automatica di ebook ed e-mail transazionali automatiche.",
      },
    ],
  },
}
