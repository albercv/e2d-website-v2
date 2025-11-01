import { HeroSection } from "@/components/sections/hero-section"
import { ServicesSection } from "@/components/sections/services-section"
import { Footer } from "@/components/layout/footer"
import { Navigation } from "@/components/layout/navigation"
import { Suspense } from "react"
import { ProjectsSectionLazy, AboutSectionLazy, AdaptSectionLazy } from "@/components/performance/lazy-components"
import { E2DChat } from "@/components/chat/e2d-chat"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        {/* Hero + Services sin fondo 3D ni ColorBends */}
        <HeroSection />
        <ServicesSection />

        {/* El resto de secciones fuera del wrapper para que no compartan el mismo fondo */}
        <Suspense fallback={<div className="py-24 bg-muted/30 animate-pulse" />}>
          <ProjectsSectionLazy />
        </Suspense>
        <Suspense fallback={<div className="py-24 bg-background animate-pulse" />}>
          <AboutSectionLazy />
        </Suspense>
        <Suspense fallback={<div className="py-24 bg-muted/30 animate-pulse" />}>
          <AdaptSectionLazy />
        </Suspense>
      </main>
      <Footer />
      <E2DChat />
    </div>
  )
}
