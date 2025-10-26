"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { useComponentDebugLogger } from "@/lib/component-debug-logger";

export function AboutSection() {
  const t = useTranslations("about");
  const { renderCount } = useComponentDebugLogger('AboutSection');

  return (
    <section id="about" className="py-16 sm:py-24 bg-background border-t border-yellow-500">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="relative aspect-square w-full max-w-sm mx-auto md:mx-0 overflow-hidden">
            <Image
              src="/AlbertoCarrasco_pic.webp"
              alt="Alberto Carrasco"
              fill
              className="object-cover rounded-full shadow-lg"
              priority
            />
            {/* Anillo dorado futurista (conic-gradient + mask), animación suave y respetando motion-safe */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none z-10 motion-safe:animate-spin"
              aria-hidden
              style={{
                animationDuration: "8s",
                background:
                  "conic-gradient(from 0deg, rgba(255,215,0,0.1) 0%, rgba(255,215,0,0.95) 20%, rgba(255,215,0,0.08) 35%, rgba(255,215,0,0.9) 50%, rgba(255,215,0,0.08) 65%, rgba(255,215,0,0.95) 80%, rgba(255,215,0,0.1) 100%)",
                WebkitMask:
                  "radial-gradient(closest-side, transparent calc(100% - 12px), #000 calc(100% - 12px))",
                mask:
                  "radial-gradient(closest-side, transparent calc(100% - 12px), #000 calc(100% - 12px))",
                filter: "saturate(1.15) brightness(1.05)",
              }}
            />
          </div>
          <div className="space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{t("title")}</h2>
            <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
            <p className="text-base leading-7 text-muted-foreground">{t("description")}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
