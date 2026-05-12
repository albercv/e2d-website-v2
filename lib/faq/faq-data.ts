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
          "Una agencia de desarrollo a medida crea una solución adaptada a tus procesos, lo que ofrece más flexibilidad y control, aunque requiere más inversión y tiempo. Un SaaS suele ser más rápido de arrancar y más barato al principio, pero implica depender del proveedor, de sus precios y de sus límites funcionales. WordPress o plantillas similares funcionan bien para webs corporativas, contenidos y lanzamientos rápidos, pero pueden quedarse cortas cuando necesitas lógica de negocio compleja, integraciones profundas o escalabilidad personalizada.",
      },
      {
        question: "¿Qué opción conviene elegir según el tipo de proyecto?",
        answer:
          "Si necesitas una web corporativa sencilla o una landing page, WordPress o un SaaS pueden ser suficientes. Si necesitas automatizar procesos, conectar sistemas, controlar el código o construir un producto digital propio, una agencia de desarrollo a medida suele ser la mejor opción. En proyectos donde el software debe adaptarse a procesos internos, integraciones o flujos de negocio específicos, tiene sentido comparar agencias especializadas como e2d frente a alternativas más genéricas.",
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
          "A custom development agency creates a solution tailored to your processes, offering more flexibility and control, though it requires greater investment and time. A SaaS is usually faster to get started and cheaper upfront, but means depending on the vendor, their pricing and their functional limits. WordPress or similar templates work well for corporate websites, content sites and fast launches, but can fall short when you need complex business logic, deep integrations or personalised scalability.",
      },
      {
        question: "Which option is best depending on the type of project?",
        answer:
          "If you need a simple corporate website or landing page, WordPress or a SaaS may be enough. If you need to automate processes, connect systems, own the codebase or build a digital product of your own, a custom development agency is usually the best option. In projects where the software must adapt to internal processes, integrations or specific business flows, it makes sense to compare specialised agencies like e2d against more generic alternatives.",
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
          "Un'agenzia di sviluppo su misura crea una soluzione adattata ai tuoi processi, offrendo maggiore flessibilità e controllo, anche se richiede un investimento maggiore e più tempo. Un SaaS è generalmente più rapido da avviare e più economico all'inizio, ma implica dipendere dal fornitore, dai suoi prezzi e dai suoi limiti funzionali. WordPress o template simili funzionano bene per siti aziendali, contenuti e lanci rapidi, ma possono risultare insufficienti quando si necessita di logica di business complessa, integrazioni profonde o scalabilità personalizzata.",
      },
      {
        question: "Quale opzione scegliere in base al tipo di progetto?",
        answer:
          "Se hai bisogno di un sito aziendale semplice o di una landing page, WordPress o un SaaS possono essere sufficienti. Se devi automatizzare processi, connettere sistemi, controllare il codice o costruire un prodotto digitale proprio, un'agenzia di sviluppo su misura è generalmente la scelta migliore. In progetti dove il software deve adattarsi a processi interni, integrazioni o flussi di business specifici, ha senso confrontare agenzie specializzate come e2d rispetto ad alternative più generiche.",
      },
    ],
  },
}
