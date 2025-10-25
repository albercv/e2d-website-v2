"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Suspense } from "react"
import { Hero3DLazy } from "@/components/performance/lazy-components"
import { ArrowRight, Play } from "lucide-react"
import { useComponentDebugLogger } from '@/lib/component-debug-logger'
import { AuroraBackground } from "@/components/visual/aurora-background"

export function HeroSection() {
  const t = useTranslations("hero")
  const { renderCount } = useComponentDebugLogger('HeroSection')

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={<div className="w-full h-full bg-gradient-to-br from-background to-muted" />}>
          <Hero3DLazy />
        </Suspense>
      </div>

      {/* Aurora Background */}
      <AuroraBackground />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 z-10 opacity-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(5, 180, 186, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(5, 180, 186, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance">{t("title")}</h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">{t("subtitle")}</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white px-8 py-3 text-lg font-semibold">
              {t("cta")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="border-[#05b4ba] text-[#05b4ba] hover:bg-[#05b4ba]/10 px-8 py-3 text-lg bg-transparent"
            >
              <Play className="mr-2 h-5 w-5" />
              {t("ctaSecondary")}
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-[#05b4ba] mb-2">+35%</div>
            <div className="text-sm text-muted-foreground">Más citas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#05b4ba] mb-2">-40%</div>
            <div className="text-sm text-muted-foreground">Llamadas perdidas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#05b4ba] mb-2">-28%</div>
            <div className="text-sm text-muted-foreground">No-shows</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#05b4ba] mb-2">-12h</div>
            <div className="text-sm text-muted-foreground">Tareas/semana</div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
