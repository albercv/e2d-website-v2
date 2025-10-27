"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Lightbulb, Puzzle, BarChart, Rocket } from "lucide-react"
import { useComponentDebugLogger } from "@/lib/component-debug-logger";

const processSteps = [
  {
    key: "diagnosis",
    icon: Search,
    color: "#05b4ba",
    description: "Análisis de objetivos, sistemas actuales y requisitos GDPR",
  },
  {
    key: "prototype",
    icon: Lightbulb,
    color: "#293039",
    description: "Demo funcional para validar la solución antes de la implementación",
  },
  {
    key: "integration",
    icon: Puzzle,
    color: "#05b4ba",
    description: "Conexión con calendario, WhatsApp, voz, Sheets y bases de datos",
  },
  {
    key: "measurement",
    icon: BarChart,
    color: "#293039",
    description: "KPIs de conversión, no-shows, tiempo ahorrado y ROI",
  },
  {
    key: "scale",
    icon: Rocket,
    color: "#05b4ba",
    description: "Documentación, training del equipo y soporte continuo",
  },
]

export function ProcessSection() {
  const t = useTranslations("process");
  const { renderCount } = useComponentDebugLogger('ProcessSection');

  return (
    <section id="process" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">{t("title")}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">{t("subtitle")}</p>
        </motion.div>

        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#05b4ba] via-[#293039] to-[#05b4ba] transform -translate-y-1/2 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 relative z-10">
            {processSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <Card className="h-full bg-card border-border hover:border-[#05b4ba]/50 transition-colors group">
                    <CardHeader className="text-center pb-4">
                      {/* Step Number */}
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-[#05b4ba] text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>

                      {/* Icon */}
                      <div className="mx-auto mb-4 p-4 rounded-lg bg-muted group-hover:bg-[#05b4ba]/10 transition-colors mt-4">
                        <Icon className="h-8 w-8 text-[#05b4ba]" />
                      </div>

                      <CardTitle className="text-lg font-semibold text-foreground">{t(`steps.${step.key}`)}</CardTitle>
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

        {/* Process Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div>
              <div className="text-2xl font-bold text-[#05b4ba] mb-2">2-4 semanas</div>
              <div className="text-sm text-muted-foreground">Tiempo de implementación</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#05b4ba] mb-2">100%</div>
              <div className="text-sm text-muted-foreground">Transparencia en el proceso</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#05b4ba] mb-2">24/7</div>
              <p className="text-sm text-muted-foreground">Soporte post-implementación</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
