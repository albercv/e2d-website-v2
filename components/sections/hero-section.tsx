"use client"

import { useLocale, useTranslations } from "next-intl"
import { ArrowRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useComponentDebugLogger } from "@/lib/component-debug-logger"
import { track } from "@/lib/analytics/track"
import LiquidEther from "./LiquidEther"

const DEMO_MAILTO =
  "mailto:hello@evolve2digital.com?subject=Solicitud de Demo&body=Hola, me gustaría solicitar una demo de sus servicios."

export function HeroSection() {
  const t = useTranslations("hero")
  const locale = useLocale()
  useComponentDebugLogger("HeroSection")

  const openContact = () => {
    track("cta_click", { cta_id: "hero_demo", locale })
    const contactButton = document.querySelector<HTMLButtonElement>("[data-contact-trigger]")
    if (contactButton) {
      contactButton.click()
      return
    }
    window.location.href = DEMO_MAILTO
  }

  const scrollToProjects = () => {
    track("cta_click", { cta_id: "hero_projects", locale })
    document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* LiquidEther como background (no afecta el layout) */}
      <div className="pointer-events-none absolute inset-0 z-0 h-full opacity-75">
        <LiquidEther
          style={{ width: "100%", height: "100%", position: "relative" }}
          colors={["#5227FF", "#FF9FFC", "#B19EEF"]}
          mouseForce={12}
          cursorSize={90}
          isViscous={true}
          viscous={18}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.35}
          autoIntensity={1.6}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        />
      </div>

      {/* El texto va en el HTML del servidor a opacidad completa: es el elemento LCP.
          Antes lo envolvía framer-motion con opacity:0 hasta hidratar y descargar
          su chunk (2,5 s de render delay en móvil). El fade es solo CSS. */}
      <div data-hero-content className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 text-center py-12">
        <div className="max-w-4xl mx-auto motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance">{t("title")}</h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">{t("subtitle")}</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white px-8 py-3 text-lg font-semibold"
              onClick={openContact}
            >
              {t("cta")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="border-[#05b4ba] text-[#05b4ba] hover:bg-[#05b4ba]/10 px-8 py-3 text-lg bg-transparent"
              onClick={scrollToProjects}
            >
              <Play className="mr-2 h-5 w-5" />
              {t("ctaSecondary")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
