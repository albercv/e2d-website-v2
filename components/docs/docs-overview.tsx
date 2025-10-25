"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Book, Boxes, Puzzle, Languages, Search, Shield, Gauge, Rocket } from "lucide-react"

export function DocsOverview({ locale }: { locale: string }) {
  const title = locale === "es" ? "Documentación interna" : "Internal documentation"
  const subtitle =
    locale === "es"
      ? "Guías técnicas del propio software. Visible solo desde URL directa; no se muestra en la navegación pública."
      : "Technical guides for the software itself. Visible via direct URL; not shown in public navigation."

  const sections = [
    {
      key: "principles",
      icon: Book,
      es: { title: "Principios", description: "Fundamentos de desarrollo y buenas prácticas" },
      en: { title: "Principles", description: "Development fundamentals and best practices" },
    },
    {
      key: "architecture",
      icon: Boxes,
      es: { title: "Arquitectura", description: "Estructura, patrones y organización del código" },
      en: { title: "Architecture", description: "Structure, patterns and code organization" },
    },
    {
      key: "components",
      icon: Puzzle,
      es: { title: "Componentes", description: "Guía y catálogo de componentes" },
      en: { title: "Components", description: "Components guide and catalog" },
    },
    {
      key: "i18n",
      icon: Languages,
      es: { title: "i18n", description: "Internacionalización y localización" },
      en: { title: "i18n", description: "Internationalization and localization" },
    },
    {
      key: "seo",
      icon: Search,
      es: { title: "SEO", description: "Metadatos y optimización de búsqueda" },
      en: { title: "SEO", description: "Metadata and search optimization" },
    },
    {
      key: "gdpr",
      icon: Shield,
      es: { title: "GDPR", description: "Privacidad y cumplimiento de datos" },
      en: { title: "GDPR", description: "Privacy and data compliance" },
    },
    {
      key: "performance",
      icon: Gauge,
      es: { title: "Rendimiento", description: "Optimización de performance" },
      en: { title: "Performance", description: "Performance optimization" },
    },
    {
      key: "deployment",
      icon: Rocket,
      es: { title: "Despliegue", description: "Llevar el proyecto a producción" },
      en: { title: "Deployment", description: "Taking the project to production" },
    },
  ] as const

  return (
    <div className="p-6">
      <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <p className="text-sm">
          Esta sección contiene documentación interna técnica del propio software. No aparece en la navegación pública.
        </p>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 text-balance">{title}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl text-pretty">{subtitle}</p>

          <div className="flex flex-wrap gap-2 mt-6">
            <Badge variant="secondary" className="bg-[#05b4ba]/10 text-[#05b4ba]">
              Next.js 15
            </Badge>
            <Badge variant="secondary" className="bg-[#05b4ba]/10 text-[#05b4ba]">
              TypeScript
            </Badge>
            <Badge variant="secondary" className="bg-[#05b4ba]/10 text-[#05b4ba]">
              TailwindCSS v4
            </Badge>
            <Badge variant="secondary" className="bg-[#05b4ba]/10 text-[#05b4ba]">
              Framer Motion
            </Badge>
            <Badge variant="secondary" className="bg-[#05b4ba]/10 text-[#05b4ba]">
              Contentlayer
            </Badge>
            <Badge variant="secondary" className="bg-[#05b4ba]/10 text-[#05b4ba]">
              next-intl
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section, index) => {
            const Icon = section.icon
            const content = (section as any)[locale as "es" | "en"] || (section as any).es
            return (
              <motion.div
                key={section.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full bg-card border-border hover:border-[#05b4ba]/50 transition-colors group">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-muted group-hover:bg-[#05b4ba]/10 transition-colors">
                        <Icon className="h-5 w-5 text-[#05b4ba]" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-foreground">{content.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground mb-4 text-pretty">
                      {content.description}
                    </CardDescription>
                    <Link href={`/${locale}/docs/${section.key}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#05b4ba] text-[#05b4ba] hover:bg-[#05b4ba]/10 bg-transparent group-hover:bg-[#05b4ba] group-hover:text-white transition-colors"
                      >
                        {locale === "es" ? "Leer más" : "Read more"}
                        <ArrowRight className="ml-2 h-3 w-3" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Quick Start */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16"
        >
          <Card className="bg-muted/30 border-border">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground">
                {locale === "es" ? "Inicio Rápido" : "Quick Start"}
              </CardTitle>
              <CardDescription>
                {locale === "es"
                  ? "Comienza explorando los principios fundamentales del proyecto"
                  : "Start by exploring the fundamental principles of the project"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href={`/${locale}/docs/principles`}>
                  <Button className="bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white">
                    {locale === "es" ? "Ver Principios" : "View Principles"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/${locale}/docs/architecture`}>
                  <Button
                    variant="outline"
                    className="border-[#05b4ba] text-[#05b4ba] hover:bg-[#05b4ba]/10 bg-transparent"
                  >
                    {locale === "es" ? "Explorar Arquitectura" : "Explore Architecture"}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
