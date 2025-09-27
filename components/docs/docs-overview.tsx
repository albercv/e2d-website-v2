"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Book, Code, Globe, Shield, Zap, Rocket, ArrowRight } from "lucide-react"
import Link from "next/link"

interface DocsOverviewProps {
  locale: string
}

const sections = [
  {
    icon: Book,
    key: "principles",
    color: "#05b4ba",
    es: {
      title: "Principios de Desarrollo",
      description: "SOLID, Clean Code, DRY/KISS/YAGNI y mejores prácticas",
    },
    en: {
      title: "Development Principles",
      description: "SOLID, Clean Code, DRY/KISS/YAGNI and best practices",
    },
  },
  {
    icon: Code,
    key: "architecture",
    color: "#293039",
    es: {
      title: "Arquitectura del Sistema",
      description: "Clean Architecture, patrones de diseño y estructura de capas",
    },
    en: {
      title: "System Architecture",
      description: "Clean Architecture, design patterns and layered structure",
    },
  },
  {
    icon: Globe,
    key: "i18n",
    color: "#05b4ba",
    es: {
      title: "Internacionalización",
      description: "Configuración i18n, slugs localizados y gestión de contenido",
    },
    en: {
      title: "Internationalization",
      description: "i18n configuration, localized slugs and content management",
    },
  },
  {
    icon: Zap,
    key: "performance",
    color: "#293039",
    es: {
      title: "Optimización de Performance",
      description: "Lazy loading, code splitting y presupuestos de performance",
    },
    en: {
      title: "Performance Optimization",
      description: "Lazy loading, code splitting and performance budgets",
    },
  },
  {
    icon: Shield,
    key: "gdpr",
    color: "#05b4ba",
    es: {
      title: "Cumplimiento GDPR",
      description: "Consentimiento, minimización de datos y derechos del usuario",
    },
    en: {
      title: "GDPR Compliance",
      description: "Consent, data minimization and user rights",
    },
  },
  {
    icon: Rocket,
    key: "deployment",
    color: "#293039",
    es: {
      title: "Despliegue y Producción",
      description: "CI/CD, monitoreo y mejores prácticas de producción",
    },
    en: {
      title: "Deployment and Production",
      description: "CI/CD, monitoring and production best practices",
    },
  },
]

export function DocsOverview({ locale }: DocsOverviewProps) {
  const title = locale === "es" ? "Documentación del Proyecto E2D" : "E2D Project Documentation"
  const subtitle =
    locale === "es"
      ? "Documentación técnica completa sobre arquitectura, principios y mejores prácticas"
      : "Complete technical documentation on architecture, principles and best practices"

  return (
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
          const content = section[locale as keyof typeof section] || section.es
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
  )
}
