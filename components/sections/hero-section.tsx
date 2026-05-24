"use client"

import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { useState, useRef } from "react"
import { ArrowRight, Play } from "lucide-react"
import { useComponentDebugLogger } from "@/lib/component-debug-logger"
import { LazyMotionSection, OptimizedMotionDiv } from "@/components/performance/motion-optimized"
import LiquidEther from "./LiquidEther"
import { track } from "@/lib/analytics/track"

export function HeroSection() {
  const t = useTranslations("hero");
  const locale = useLocale();
  const { renderCount } = useComponentDebugLogger('HeroSection');
  const [isHovering, setIsHovering] = useState(false);
  
  // Ref for the hero section container
  const heroSectionRef = useRef<HTMLElement>(null);

  return (
    <section 
      ref={heroSectionRef}
      className="relative h-screen flex items-center justify-center overflow-hidden bg-background"
    >
      {/* LiquidEther como background (no afecta el layout) */}
      <div className="pointer-events-none absolute inset-0 z-0 h-full opacity-75">
        <LiquidEther
          style={{ width: '100%', height: '100%', position: 'relative' }}
          colors={[ '#5227FF', '#FF9FFC', '#B19EEF' ]}
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

      {/* Content */}
      <div 
        className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 text-center py-12"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <OptimizedMotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance">{t("title")}</h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">{t("subtitle")}</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white px-8 py-3 text-lg font-semibold"
              onClick={() => {
                track("cta_click", { cta_id: "hero_demo", locale })
                // Open contact modal by triggering the navigation contact button
                const contactButton = document.querySelector('[data-contact-trigger]') as HTMLButtonElement;
                if (contactButton) {
                  contactButton.click();
                } else {
                  // Fallback: open email client
                  window.location.href = 'mailto:hello@evolve2digital.com?subject=Solicitud de Demo&body=Hola, me gustaría solicitar una demo de sus servicios.';
                }
              }}
            >
              {t("cta")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="border-[#05b4ba] text-[#05b4ba] hover:bg-[#05b4ba]/10 px-8 py-3 text-lg bg-transparent"
              onClick={() => {
                track("cta_click", { cta_id: "hero_projects", locale })
                // Scroll to projects section
                const projectsSection = document.getElementById('projects');
                if (projectsSection) {
                  projectsSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <Play className="mr-2 h-5 w-5" />
              {t("ctaSecondary")}
            </Button>
          </div>
        </OptimizedMotionDiv>

        {/* Capability bullets */}
        <OptimizedMotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
        >
          <div className="text-center">
            <div className="text-base sm:text-lg font-semibold text-[#05b4ba]">{t("stats.customSoftware")}</div>
          </div>
          <div className="text-center">
            <div className="text-base sm:text-lg font-semibold text-[#05b4ba]">{t("stats.processAutomation")}</div>
          </div>
          <div className="text-center">
            <div className="text-base sm:text-lg font-semibold text-[#05b4ba]">{t("stats.aiIntegrations")}</div>
          </div>
          <div className="text-center">
            <div className="text-base sm:text-lg font-semibold text-[#05b4ba]">{t("stats.internalErpCrm")}</div>
          </div>
        </OptimizedMotionDiv>
      </div>
    </section>
  )
}
