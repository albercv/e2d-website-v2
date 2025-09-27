"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronRight, Menu, X } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

interface DocsNavigationProps {
  locale: string
  activeSlug?: string
}

const docsStructure = {
  es: [
    {
      title: "Introducción",
      items: [
        { title: "Visión General", slug: "" },
        { title: "Principios", slug: "principles" },
      ],
    },
    {
      title: "Arquitectura",
      items: [
        { title: "Estructura del Sistema", slug: "architecture" },
        { title: "Patrones de Diseño", slug: "patterns" },
      ],
    },
    {
      title: "Desarrollo",
      items: [
        { title: "Guía de Componentes", slug: "components" },
        { title: "Internacionalización", slug: "i18n" },
        { title: "SEO y Metadatos", slug: "seo" },
      ],
    },
    {
      title: "Cumplimiento",
      items: [
        { title: "GDPR", slug: "gdpr" },
        { title: "Performance", slug: "performance" },
      ],
    },
    {
      title: "Despliegue",
      items: [{ title: "Producción", slug: "deployment" }],
    },
  ],
  en: [
    {
      title: "Introduction",
      items: [
        { title: "Overview", slug: "" },
        { title: "Principles", slug: "principles" },
      ],
    },
    {
      title: "Architecture",
      items: [
        { title: "System Structure", slug: "architecture" },
        { title: "Design Patterns", slug: "patterns" },
      ],
    },
    {
      title: "Development",
      items: [
        { title: "Components Guide", slug: "components" },
        { title: "Internationalization", slug: "i18n" },
        { title: "SEO and Metadata", slug: "seo" },
      ],
    },
    {
      title: "Compliance",
      items: [
        { title: "GDPR", slug: "gdpr" },
        { title: "Performance", slug: "performance" },
      ],
    },
    {
      title: "Deployment",
      items: [{ title: "Production", slug: "deployment" }],
    },
  ],
}

export function DocsNavigation({ locale, activeSlug }: DocsNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const structure = docsStructure[locale as keyof typeof docsStructure] || docsStructure.es

  const NavigationContent = () => (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {locale === "es" ? "Documentación" : "Documentation"}
          </h2>
        </div>

        {structure.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{section.title}</h3>
            <ul className="space-y-1">
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Link
                    href={`/${locale}/docs${item.slug ? `/${item.slug}` : ""}`}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                      activeSlug === item.slug || (!activeSlug && !item.slug)
                        ? "bg-[#05b4ba]/10 text-[#05b4ba] font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <ChevronRight className="h-3 w-3" />
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ScrollArea>
  )

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-20 left-4 z-50 md:hidden bg-background border border-border"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r border-border bg-background/50 backdrop-blur-sm">
        <NavigationContent />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-16 left-0 bottom-0 z-50 w-64 bg-background border-r border-border md:hidden"
            >
              <NavigationContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
