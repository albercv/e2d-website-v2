"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Suspense, useState, lazy, useRef } from "react"
import { ArrowRight, Play } from "lucide-react"
import { useComponentDebugLogger } from "@/lib/component-debug-logger"
import { useIntelligentOrbLoading } from "@/hooks/use-intelligent-orb-loading"
import { OrbSkeleton } from "@/components/ui/orb-skeleton"
import { LazyMotionSection, OptimizedMotionDiv } from "@/components/performance/motion-optimized"

// Ultra-lazy load the optimized Orb component with Web Worker support
const LazyOrbOptimized = lazy(() => 
  import("@/components/ui/orb-optimized").then(module => ({ default: module.OrbOptimized }))
)

export function HeroSection() {
  const t = useTranslations("hero");
  const { renderCount } = useComponentDebugLogger('HeroSection');
  const [isHovering, setIsHovering] = useState(false);
  
  // Ref for the hero section container
  const heroSectionRef = useRef<HTMLElement>(null);
  
  // Intelligent Orb loading with performance optimizations
  const {
    shouldLoadOrb,
    isOrbLoaded,
    markAsLoaded,
    canRender,
    isLoading
  } = useIntelligentOrbLoading(heroSectionRef, {
    delay: 200, // Small delay to let critical content render first
    useIntersectionObserver: true,
    threshold: 0.1,
    useIdleCallback: true
  });

  return (
    <section 
      ref={heroSectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background"
    >
      {/* Orb Background with Intelligent Loading */}
      <div className="absolute inset-0 z-0">
        {canRender ? (
          <Suspense fallback={<OrbSkeleton animated={true} />}>
            <LazyOrbOptimized 
              hoverIntensity={isHovering ? 3.2 : 1.8} 
              forceHoverState={isHovering}
              onLoad={() => {
                console.log('Orb loaded successfully');
                markAsLoaded();
              }}
            />
          </Suspense>
        ) : (
          <OrbSkeleton animated={true} />
        )}
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

        {/* Stats */}
        <OptimizedMotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-[#05b4ba] mb-2">+35%</div>
            <div className="text-sm text-muted-foreground">{t("stats.moreAppointments")}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#05b4ba] mb-2">-40%</div>
            <div className="text-sm text-muted-foreground">{t("stats.missedCalls")}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#05b4ba] mb-2">-28%</div>
            <div className="text-sm text-muted-foreground">{t("stats.noShows")}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#05b4ba] mb-2">-12h</div>
            <div className="text-sm text-muted-foreground">{t("stats.tasksPerWeek")}</div>
          </div>
        </OptimizedMotionDiv>
      </div>
    </section>
  )
}
