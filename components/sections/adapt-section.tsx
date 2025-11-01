"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Cog, Code2, Microscope, Rocket } from "lucide-react"
import { useLocale } from "next-intl"

export function AdaptSection() {
  const locale = useLocale()

  const textByLocale = {
    es: {
      title: "⚙️ Método A.D.A.P.T.",
      subtitle: "Del diagnóstico a la entrega, en 5 pasos medibles.",
      p1: "En E2D acompañamos cada proyecto de principio a fin con comunicación continua, seguimiento diario e informes claros.",
      p2: "Transparencia total desde el primer día hasta la entrega final.",
      titles: ["Analizar", "Diseñar", "Aplicar", "Probar", "Transferir"],
      descriptions: [
        "Reunión inicial para entender tu negocio, objetivos y alcance del proyecto.",
        "Definimos la arquitectura, las tecnologías y el plan de ejecución.",
        "Desarrollamos las soluciones de software y reportamos avances diarios.",
        "Testeo completo, revisión y optimización antes de lanzar.",
        "Entrega final con formación, documentación y soporte continuo.",
      ],
    },
    en: {
      title: "⚙️ A.D.A.P.T. Method",
      subtitle: "From diagnosis to delivery, in 5 measurable steps.",
      p1: "At E2D we support every project end-to-end with continuous communication, daily tracking and clear reporting.",
      p2: "Full transparency from day one to final delivery.",
      titles: ["Analyze", "Design", "Apply", "Test", "Transfer"],
      descriptions: [
        "Initial meeting to understand your business, goals and project scope.",
        "We define architecture, technologies and the execution plan.",
        "We implement the software solutions and report daily progress.",
        "Full testing, review and optimization before launch.",
        "Final delivery with training, documentation and ongoing support.",
      ],
    },
    it: {
      title: "⚙️ Metodo A.D.A.P.T.",
      subtitle: "Dalla diagnosi alla consegna, in 5 passi misurabili.",
      p1: "In E2D accompagniamo ogni progetto dall'inizio alla fine con comunicazione continua, monitoraggio quotidiano e report chiari.",
      p2: "Trasparenza totale dal primo giorno fino alla consegna finale.",
      titles: ["Analizzare", "Progettare", "Applicare", "Testare", "Trasferire"],
      descriptions: [
        "Incontro iniziale per comprendere la tua azienda, obiettivi e ambito del progetto.",
        "Definiamo l'architettura, le tecnologie e il piano di esecuzione.",
        "Sviluppiamo le soluzioni software e riportiamo i progressi quotidianamente.",
        "Test completo, revisione e ottimizzazione prima del lancio.",
        "Consegna finale con formazione, documentazione e supporto continuo.",
      ],
    },
  }

  const strings = textByLocale[locale as keyof typeof textByLocale] ?? textByLocale.es

  const baseSteps = [
    { key: "A", Icon: Search, color: "#05b4ba" },
    { key: "D", Icon: Cog, color: "#293039" },
    { key: "A", Icon: Code2, color: "#05b4ba" },
    { key: "P", Icon: Microscope, color: "#293039" },
    { key: "T", Icon: Rocket, color: "#05b4ba" },
  ]

  const steps = baseSteps.map((base, index) => ({
    ...base,
    title: strings.titles[index],
    description: strings.descriptions[index],
  }))

  return (
    <section id="adapt" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            {strings.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            {strings.subtitle}
          </p>
          <div className="mt-6 space-y-2 text-muted-foreground text-pretty">
            <p>
              {strings.p1}
            </p>
            <p>{strings.p2}</p>
          </div>
        </motion.div>

        <div className="relative">
          {/* Línea de conexión */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#05b4ba] via-[#293039] to-[#05b4ba] transform -translate-y-1/2 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 relative z-10">
            {steps.map((step, index) => {
              const Icon = step.Icon
              return (
                <motion.div
                  key={`${step.key}-${step.title}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <Card className="h-full bg-card border-border hover:border-[#05b4ba]/50 transition-colors group">
                    <CardHeader className="text-center pb-4">
                      {/* Número de paso */}
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-[#05b4ba] text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>

                      {/* Icono */}
                      <div className="mx-auto mb-4 p-4 rounded-lg bg-muted group-hover:bg-[#05b4ba]/10 transition-colors mt-4">
                        <Icon className="h-8 w-8 text-[#05b4ba]" />
                      </div>

                      <CardTitle className="text-lg font-semibold text-foreground">
                        {step.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="text-center pt-0">
                      <p className="text-sm text-muted-foreground text-pretty">{step.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}