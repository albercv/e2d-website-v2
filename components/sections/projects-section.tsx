"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Phone, Calendar } from "lucide-react"
import { useComponentDebugLogger } from "@/lib/component-debug-logger";

const projects = [
  {
    title: "Voicebot Inmobiliario",
    challenge: "Llamadas perdidas y gestión manual de citas",
    solution: "Agente de voz IA + integración calendario",
    result: "+35% citas, -40% llamadas perdidas",
    metric: "+35%",
    icon: Phone,
    stack: ["React", "n8n", "Calendly", "OpenAI"],
  },
  {
    title: "WhatsApp Bot Clínica",
    challenge: "Alto índice de no-shows y seguimiento manual",
    solution: "Bot WhatsApp + recordatorios automáticos",
    result: "-28% no-shows, +22% conversión",
    metric: "-28%",
    icon: Calendar,
    stack: ["WhatsApp API", "n8n", "Supabase", "Twilio"],
    url: "/es/blog/automatizar-whatsapp-clinicas",
  },
];

export function ProjectsSection() {
  const t = useTranslations("projects");
  const { renderCount } = useComponentDebugLogger('ProjectsSection');

  return (
    <section id="projects" className="py-24 bg-muted/30 border-t border-yellow-500">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => {
            const Icon = project.icon
            return (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full bg-card border-border hover:border-[#05b4ba]/50 transition-colors group">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 rounded-lg bg-[#05b4ba]/10">
                        <Icon className="h-6 w-6 text-[#05b4ba]" />
                      </div>
                      <div className="text-2xl font-bold text-[#05b4ba]">{project.metric}</div>
                    </div>
                    <CardTitle className="text-xl font-semibold text-foreground">{project.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Reto:</h4>
                      <CardDescription className="text-muted-foreground">{project.challenge}</CardDescription>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-2">Solución:</h4>
                      <CardDescription className="text-muted-foreground">{project.solution}</CardDescription>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-2">Resultado:</h4>
                      <CardDescription className="text-[#05b4ba] font-medium">{project.result}</CardDescription>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-4">
                      {project.stack.map((tech) => (
                        <Badge key={tech} variant="secondary" className="bg-muted text-muted-foreground">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
