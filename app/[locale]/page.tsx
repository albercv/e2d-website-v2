import { HeroSection } from "@/components/sections/hero-section"
import { ServicesSection } from "@/components/sections/services-section"
import { Footer } from "@/components/layout/footer"
import { Navigation } from "@/components/layout/navigation"
import { AIAgentButton } from "@/components/ai-agent/ai-agent-button"
import { Suspense } from "react"
import { ProjectsSectionLazy, AboutSectionLazy, ProcessSectionLazy } from "@/components/performance/lazy-components"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <HeroSection />
        <ServicesSection />
        <Suspense fallback={<div className="py-24 bg-muted/30 animate-pulse" />}>
          <ProjectsSectionLazy />
        </Suspense>
        <Suspense fallback={<div className="py-24 bg-background animate-pulse" />}>
          <AboutSectionLazy />
        </Suspense>
        <Suspense fallback={<div className="py-24 bg-muted/30 animate-pulse" />}>
          <ProcessSectionLazy />
        </Suspense>
      </main>
      <Footer />
      <AIAgentButton />
    </div>
  )
}
