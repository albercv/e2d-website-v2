"use client"

import { useLocale, useTranslations } from "next-intl"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight, ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useComponentDebugLogger } from "@/lib/component-debug-logger"
import { PORTFOLIO_URL_BY_LOCALE, type EntityLocale } from "@/lib/seo/entities"
import ElectricBorder from "@/components/ElectricBorder"

type ProjectKey = "abyfoods" | "augustcollection" | "ferdyCoach" | "chatbotWhatsapp"

interface ProjectEntry {
  key: ProjectKey
  image: string
  /** Public site of the client project; absent when it has no public domain. */
  site?: { url: string; domain: string }
  /** Case-study post, only where one exists. */
  caseStudyPath?: Record<EntityLocale, string>
}

// Domains and post paths are facts, not copy: they stay out of the messages so
// the three translations can never disagree about where a card points.
const PROJECTS: readonly ProjectEntry[] = [
  {
    key: "abyfoods",
    image: "/abyfoods.png",
    site: { url: "https://abyfoods.fi", domain: "abyfoods.fi" },
  },
  {
    key: "augustcollection",
    image: "/augustcollection.png",
    site: { url: "https://augustore.es", domain: "augustore.es" },
  },
  {
    key: "ferdyCoach",
    image: "/ferdyCoach.png",
    site: { url: "https://ferdycoachdesamor.com", domain: "ferdycoachdesamor.com" },
    caseStudyPath: {
      es: "/es/blog/de-atender-curiosos-a-cerrar-clientes-la-web-de-ferdy",
      en: "/en/blog/from-fielding-curious-visitors-to-closing-clients-ferdys-website",
      it: "/it/blog/da-rispondere-ai-curiosi-a-chiudere-clienti-il-sito-di-ferdy",
    },
  },
  {
    key: "chatbotWhatsapp",
    image: "/chatbotWhatsapp.png",
  },
]

// The ring is the visible keyboard focus; the Electric Border only reacts to hover.
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05b4ba]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
const CARD_LINK_CLASS = `inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-[#05b4ba] underline-offset-4 hover:underline ${FOCUS_RING}`
const INLINE_LINK_CLASS = `rounded-sm font-medium text-[#05b4ba] underline underline-offset-4 hover:no-underline ${FOCUS_RING}`

function isEntityLocale(value: string): value is EntityLocale {
  return value === "es" || value === "en" || value === "it"
}

function ProjectLinks({ project, locale }: { project: ProjectEntry; locale: EntityLocale }) {
  const t = useTranslations("projects")
  const caseHref = project.caseStudyPath?.[locale]
  if (!project.site && !caseHref) return null

  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
      {project.site && (
        <a href={project.site.url} target="_blank" rel="noopener noreferrer" className={CARD_LINK_CLASS}>
          {project.site.domain}
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="sr-only">, {t("visitSite")}</span>
        </a>
      )}
      {caseHref && (
        <a href={caseHref} className={CARD_LINK_CLASS}>
          {t("readCase")}
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  )
}

function ProjectCard({ project, index, locale }: { project: ProjectEntry; index: number; locale: EntityLocale }) {
  const t = useTranslations("projects")
  const title = t(`${project.key}.title`)
  const tags: string[] = t.raw(`${project.key}.tags`)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="h-full"
    >
      <ElectricBorder color="#05b4ba" speed={1} chaos={0.6} thickness={2} className="rounded-xl hover-only h-full block" style={{ borderRadius: 12 }}>
        <Card className="h-full min-h-[440px] flex flex-col bg-card border-border hover:border-[#05b4ba]/50 transition-colors group overflow-hidden rounded-xl">
          <div className="relative h-48 w-full">
            <Image
              src={project.image}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">{title}</CardTitle>
          </CardHeader>
          <CardContent className="mt-auto">
            <CardDescription className="text-muted-foreground mb-4 line-clamp-3">{t(`${project.key}.description`)}</CardDescription>
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="secondary" className="bg-muted text-muted-foreground">
                  {tag}
                </Badge>
              ))}
            </div>
            <ProjectLinks project={project} locale={locale} />
          </CardContent>
        </Card>
      </ElectricBorder>
    </motion.div>
  )
}

function PortfolioCta({ locale }: { locale: EntityLocale }) {
  const t = useTranslations("projects")

  return (
    <p className="mt-12 text-center text-muted-foreground text-pretty">
      {t.rich("portfolioCta", {
        link: (chunks) => (
          <a
            href={PORTFOLIO_URL_BY_LOCALE[locale]}
            hrefLang={locale === "es" ? "es" : "en"}
            target="_blank"
            rel="noopener"
            className={INLINE_LINK_CLASS}
          >
            {chunks}
          </a>
        ),
      })}
    </p>
  )
}

export function ProjectsSection() {
  const t = useTranslations("projects")
  const currentLocale = useLocale()
  const locale = isEntityLocale(currentLocale) ? currentLocale : "es"
  useComponentDebugLogger("ProjectsSection")

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {PROJECTS.map((project, index) => (
            <ProjectCard key={project.key} project={project} index={index} locale={locale} />
          ))}
        </div>

        <PortfolioCta locale={locale} />
      </div>
    </section>
  )
}
