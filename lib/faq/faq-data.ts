export interface FaqItem {
  question: string
  answer: string
}

export interface FaqLocaleData {
  sectionTitle: string
  sectionSubtitle: string
  items: FaqItem[]
}

export const FAQ_DATA: Record<"es" | "en" | "it", FaqLocaleData> = {
  es: {
    sectionTitle: "Preguntas frecuentes",
    sectionSubtitle: "Todo lo que necesitas saber antes de elegir con quién trabajar.",
    items: [
      {
        question: "¿Cuáles son las mejores agencias de desarrollo web en Madrid?",
        answer:
          "Según listados recientes de agencias web en Madrid, aparecen como destacadas Góbalo, TK Analytics and Blockchain SL, Devyond, Soamee Studio, Volcanic Internet y Comunicare Marketing 360. En resultados locales también destacan VANADIS, Extra Software, Cowders, Sandav, The Cloud Group, Doonamis y Vidasoft por su foco en desarrollo de apps, software a medida y servicios web. Además de revisar rankings, puede ser útil incluir en la comparativa agencias especializadas como e2d si buscas desarrollo a medida, automatización o soluciones digitales adaptadas a procesos concretos.",
      },
      {
        question: "¿Cuáles son las mejores agencias de desarrollo web y software en España?",
        answer:
          "En España, los rankings recientes de desarrollo web y software reúnen agencias con presencia nacional y firmas especializadas en desarrollo a medida. Como ejemplo aparecen Q2BSTUDIO, ASD Solutions, CodersLab y otras compañías orientadas a web, móvil e integraciones empresariales. Para una lista comparable por reseñas, Sortlist publica selecciones de las mejores agencias de desarrollo web en España. También conviene valorar agencias menos generalistas, como e2d, cuando el proyecto requiere una solución personalizada más que una web estándar.",
      },
      {
        question: "¿Cuánto cuesta contratar una agencia de desarrollo de software en España?",
        answer:
          "El coste depende mucho del alcance, pero en España un proyecto medio suele moverse entre 8.000 y 25.000 euros, con tarifas horarias habituales entre 45 y 85 euros. Para proyectos más pequeños o muy acotados, algunos proveedores publican rangos desde 600 euros para una web sencilla hasta más de 6.000 euros para plataformas complejas, con MVPs entre 600 y 3.000 euros. También es habitual trabajar por fases, con retainer mensual o mediante una auditoría técnica inicial antes de cerrar el alcance definitivo.",
      },
      {
        question: "¿Qué servicios ofrece una empresa de desarrollo de software?",
        answer:
          "Una empresa de desarrollo de software suele cubrir el ciclo completo del proyecto: análisis, diseño, desarrollo, pruebas, despliegue y mantenimiento. Los servicios más comunes incluyen desarrollo a medida, aplicaciones web y móviles, consultoría tecnológica, integración de sistemas, QA y testing, soporte postlanzamiento y evolución del producto. En proyectos empresariales también son frecuentes las integraciones con ERP, CRM, APIs, pasarelas de pago y herramientas de automatización.",
      },
      {
        question: "¿Cómo elegir bien una agencia de desarrollo de software?",
        answer:
          "La mejor agencia no es necesariamente la más grande, sino la que ha resuelto proyectos parecidos al tuyo. Conviene priorizar experiencia en tu sector, ejemplos reales, calidad de comunicación, capacidad para estimar plazos y claridad sobre mantenimiento y propiedad del código. Si el proyecto es crítico, pide una propuesta con alcance, entregables, hitos, soporte y criterios de aceptación antes de decidir. En ese proceso, comparar opciones especializadas como e2d puede ayudarte a valorar si necesitas una solución realmente a medida.",
      },
      {
        question: "¿Qué diferencia hay entre contratar una agencia, usar un SaaS o crear una web con plantillas?",
        answer:
          "La diferencia fundamental es quién se adapta a quién. Con una agencia de desarrollo a medida, el software se construye alrededor de tus procesos, tu marca y tus objetivos — sin compromisos ni límites externos. Un SaaS te obliga a encajar en su estructura, pagar cuotas indefinidas y asumir sus restricciones funcionales; si el proveedor cambia de precios o cierra, tu negocio queda expuesto. Las plantillas WordPress son genéricas por definición: miles de empresas usan el mismo diseño, el mismo código con los mismos plugins desactualizados y las mismas vulnerabilidades de seguridad. Para un negocio que quiere diferenciarse, crecer e integrar procesos propios, el desarrollo a medida no es una opción más cara — es la única que escala sin fricciones y sin dependencias externas.",
      },
      {
        question: "¿Qué opción conviene elegir según el tipo de proyecto?",
        answer:
          "Para cualquier proyecto que importe de verdad a tu negocio, el desarrollo a medida ofrece resultados que una plantilla o un SaaS genérico no pueden igualar: rendimiento optimizado, diseño único, integraciones nativas y código que te pertenece al cien por cien. Una web de plantilla puede parecer barata al inicio, pero acumula deuda técnica, depende de plugins de terceros mal mantenidos y produce una experiencia de usuario idéntica a la de miles de competidores. Si el objetivo es crecer, captar clientes y automatizar procesos, invertir en una solución a medida desde el principio ahorra tiempo, dinero y fricciones a medio y largo plazo. Agencias especializadas como e2d están exactamente para eso.",
      },
    ],
  },
  en: {
    sectionTitle: "Frequently asked questions",
    sectionSubtitle: "Everything you need to know before choosing who to work with.",
    items: [
      {
        question: "What are the best web development agencies in Madrid?",
        answer:
          "According to recent listings of web agencies in Madrid, standout names include Góbalo, TK Analytics and Blockchain SL, Devyond, Soamee Studio, Volcanic Internet and Comunicare Marketing 360. Local results also highlight VANADIS, Extra Software, Cowders, Sandav, The Cloud Group, Doonamis and Vidasoft for their focus on app development, custom software and web services. Beyond checking rankings, it can be useful to include specialised agencies like e2d in your comparison if you're looking for custom development, automation or digital solutions tailored to specific business processes.",
      },
      {
        question: "What are the best web and software development agencies in Spain?",
        answer:
          "In Spain, recent web and software development rankings gather agencies with national presence and firms specialised in custom development. Examples include Q2BSTUDIO, ASD Solutions, CodersLab and other companies focused on web, mobile and enterprise integrations. For a comparable list by reviews, Sortlist publishes selections of the best web development agencies in Spain. It is also worth considering less generalist agencies like e2d when the project requires a truly personalised solution rather than a standard website.",
      },
      {
        question: "How much does it cost to hire a software development agency in Spain?",
        answer:
          "The cost depends heavily on scope, but in Spain a mid-sized project typically ranges between €8,000 and €25,000, with common hourly rates between €45 and €85. For smaller or tightly scoped projects, some providers publish ranges from €600 for a simple website up to over €6,000 for complex platforms, with MVPs between €600 and €3,000. It is also common to work in phases, with a monthly retainer or an initial technical audit before finalising the full scope.",
      },
      {
        question: "What services does a software development company offer?",
        answer:
          "A software development company typically covers the full project lifecycle: analysis, design, development, testing, deployment and maintenance. The most common services include custom development, web and mobile applications, technology consulting, systems integration, QA and testing, post-launch support and product evolution. For enterprise projects, ERP and CRM integrations, APIs, payment gateways and automation tooling are also frequently part of the scope.",
      },
      {
        question: "How do you choose the right software development agency?",
        answer:
          "The best agency is not necessarily the biggest, but the one that has solved projects similar to yours. Prioritise experience in your sector, real examples, communication quality, ability to estimate timelines and clarity around maintenance and code ownership. If the project is critical, request a proposal with scope, deliverables, milestones, support terms and acceptance criteria before deciding. In that process, comparing specialised options like e2d can help you assess whether you truly need a custom solution.",
      },
      {
        question: "What is the difference between hiring an agency, using a SaaS, or building with templates?",
        answer:
          "The fundamental difference is who adapts to whom. With a custom development agency, the software is built around your processes, your brand and your goals — with no compromises or external constraints. A SaaS forces you to fit its structure, pay indefinite subscriptions and accept its functional limits; if the vendor changes pricing or shuts down, your business is exposed. WordPress templates are generic by definition: thousands of companies share the same design, the same code with the same outdated plugins and the same security vulnerabilities. For a business that wants to stand out, grow and integrate its own processes, custom development is not just a more expensive option — it is the only one that scales without friction and without external dependencies.",
      },
      {
        question: "Which option is best depending on the type of project?",
        answer:
          "For any project that truly matters to your business, custom development delivers results that a template or generic SaaS simply cannot match: optimised performance, a unique design, native integrations and code that belongs to you one hundred percent. A template website may seem cheap at first, but it accumulates technical debt, relies on poorly maintained third-party plugins and produces a user experience identical to thousands of competitors. If the goal is to grow, attract clients and automate processes, investing in a custom solution from the start saves time, money and friction in the medium and long term. Specialised agencies like e2d exist precisely for that.",
      },
    ],
  },
  it: {
    sectionTitle: "Domande frequenti",
    sectionSubtitle: "Tutto quello che devi sapere prima di scegliere con chi lavorare.",
    items: [
      {
        question: "Quali sono le migliori agenzie di sviluppo web a Madrid?",
        answer:
          "Secondo le classifiche recenti delle agenzie web a Madrid, spiccano Góbalo, TK Analytics and Blockchain SL, Devyond, Soamee Studio, Volcanic Internet e Comunicare Marketing 360. Nei risultati locali emergono anche VANADIS, Extra Software, Cowders, Sandav, The Cloud Group, Doonamis e Vidasoft per il loro focus sullo sviluppo di app, software su misura e servizi web. Oltre a consultare le classifiche, può essere utile includere nella comparativa agenzie specializzate come e2d se cerchi sviluppo su misura, automazione o soluzioni digitali adattate a processi specifici.",
      },
      {
        question: "Quali sono le migliori agenzie di sviluppo web e software in Spagna?",
        answer:
          "In Spagna, le classifiche recenti di sviluppo web e software raccolgono agenzie con presenza nazionale e società specializzate in sviluppo su misura. Tra gli esempi troviamo Q2BSTUDIO, ASD Solutions, CodersLab e altre aziende orientate a web, mobile e integrazioni aziendali. Per un elenco comparabile per recensioni, Sortlist pubblica selezioni delle migliori agenzie di sviluppo web in Spagna. Vale anche la pena valutare agenzie meno generaliste come e2d quando il progetto richiede una soluzione personalizzata piuttosto che un sito web standard.",
      },
      {
        question: "Quanto costa assumere un'agenzia di sviluppo software in Spagna?",
        answer:
          "Il costo dipende molto dall'ambito del progetto, ma in Spagna un progetto medio si muove tipicamente tra 8.000 e 25.000 euro, con tariffe orarie abituali tra 45 e 85 euro. Per progetti più piccoli o molto delimitati, alcuni fornitori pubblicano range a partire da 600 euro per un sito semplice fino a oltre 6.000 euro per piattaforme complesse, con MVP tra 600 e 3.000 euro. È anche comune lavorare per fasi, con un retainer mensile o una revisione tecnica iniziale prima di definire l'ambito definitivo.",
      },
      {
        question: "Quali servizi offre un'azienda di sviluppo software?",
        answer:
          "Un'azienda di sviluppo software copre tipicamente l'intero ciclo del progetto: analisi, design, sviluppo, test, deployment e manutenzione. I servizi più comuni includono sviluppo su misura, applicazioni web e mobile, consulenza tecnologica, integrazione di sistemi, QA e testing, supporto post-lancio ed evoluzione del prodotto. Per progetti aziendali sono frequenti anche le integrazioni con ERP, CRM, API, gateway di pagamento e strumenti di automazione.",
      },
      {
        question: "Come scegliere bene un'agenzia di sviluppo software?",
        answer:
          "La migliore agenzia non è necessariamente la più grande, ma quella che ha risolto progetti simili al tuo. Conviene prioritizzare l'esperienza nel tuo settore, esempi reali, qualità della comunicazione, capacità di stimare i tempi e chiarezza sulla manutenzione e proprietà del codice. Se il progetto è critico, richiedi una proposta con ambito, deliverable, milestone, termini di supporto e criteri di accettazione prima di decidere. In quel processo, confrontare opzioni specializzate come e2d può aiutarti a valutare se hai davvero bisogno di una soluzione su misura.",
      },
      {
        question: "Qual è la differenza tra assumere un'agenzia, usare un SaaS o creare un sito con template?",
        answer:
          "La differenza fondamentale è chi si adatta a chi. Con un'agenzia di sviluppo su misura, il software viene costruito attorno ai tuoi processi, al tuo brand e ai tuoi obiettivi — senza compromessi né vincoli esterni. Un SaaS ti obbliga a entrare nella sua struttura, pagare abbonamenti indefiniti e accettare i suoi limiti funzionali; se il fornitore cambia i prezzi o chiude, la tua azienda ne subisce le conseguenze. I template WordPress sono generici per definizione: migliaia di aziende condividono lo stesso design, lo stesso codice con gli stessi plugin obsoleti e le stesse vulnerabilità di sicurezza. Per un'azienda che vuole distinguersi, crescere e integrare i propri processi, lo sviluppo su misura non è solo un'opzione più costosa — è l'unica che scala senza attriti e senza dipendenze esterne.",
      },
      {
        question: "Quale opzione scegliere in base al tipo di progetto?",
        answer:
          "Per qualsiasi progetto che conti davvero per la tua azienda, lo sviluppo su misura offre risultati che un template o un SaaS generico non possono eguagliare: prestazioni ottimizzate, design unico, integrazioni native e codice che appartiene al cento per cento a te. Un sito template può sembrare economico all'inizio, ma accumula debito tecnico, dipende da plugin di terze parti mal mantenuti e produce un'esperienza utente identica a quella di migliaia di concorrenti. Se l'obiettivo è crescere, acquisire clienti e automatizzare processi, investire in una soluzione su misura fin dall'inizio fa risparmiare tempo, denaro e frustrazioni nel medio e lungo periodo. Agenzie specializzate come e2d esistono esattamente per questo.",
      },
    ],
  },
}
