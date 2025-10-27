"use client"

import { useTranslations } from "next-intl"
import Image from "next/image"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useComponentDebugLogger } from "@/lib/component-debug-logger"
import ElectricBorder from "@/components/ElectricBorder"

export function ProjectsSection() {
  const t = useTranslations("projects")
  const { renderCount } = useComponentDebugLogger("ProjectsSection")

  const projects = [
    { 
      image: "/abyfoods.png",
      title: t("abyfoods.title"),
      description: t("abyfoods.description"),
      tags: t.raw("abyfoods.tags")
    },
    {
      image: "/augustcollection.png",
      title: t("augustcollection.title"),
      description: t("augustcollection.description"),
      tags: t.raw("augustcollection.tags")
    },
    {
      image: "/ferdyCoach.png",
      title: t("ferdyCoach.title"),
      description: t("ferdyCoach.description"),
      tags: t.raw("ferdyCoach.tags")
    },
    {
      image: "/chatbotWhatsapp.png",
      title: t("chatbotWhatsapp.title"),
      description: t("chatbotWhatsapp.description"),
      tags: t.raw("chatbotWhatsapp.tags")
    },
  ]

  return (
    <section id="projects" className="py-24 bg-muted/30">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <ElectricBorder color="#05b4ba" speed={1} chaos={0.6} thickness={2} className="rounded-xl hover-only" style={{ borderRadius: 12 }}>
                <Card className="h-full bg-card border-border hover:border-[#05b4ba]/50 transition-colors group overflow-hidden rounded-xl">
                  <div className="relative h-48 w-full">
                    <Image
                      src={project.image}
                      alt={project.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-foreground">{project.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground mb-4">{project.description}</CardDescription>
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="bg-muted text-muted-foreground">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </ElectricBorder>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
