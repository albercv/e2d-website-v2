"use client"

import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"

export function Footer() {
  const locale = useLocale()
  const tNav = useTranslations("navigation")
  const tFooter = useTranslations("footer")

  return (
    <footer className="border-t border-border bg-background/80 backdrop-blur">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 sm:py-12">
          {/* Main footer content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Company info */}
            <div className="space-y-4">
              <a href={`/${locale}`} className="flex items-center gap-3">
                <Image
                  src="/e2d_logo.webp"
                  alt="E2D logo"
                  width={120}
                  height={32}
                  className="h-6 w-auto"
                  priority
                />
              </a>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Evolve2Digital</strong></p>
                <p>Automatización empresarial con IA</p>
                <p>
                  <a 
                    href={`mailto:${tFooter("contact")}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {tFooter("contact")}
                  </a>
                </p>
                <p>Valencia, España</p>
              </div>
            </div>

            {/* Navigation links */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Navegación</h3>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <a href={`/${locale}/blog`} className="hover:text-foreground transition-colors">
                  {tNav("blog")}
                </a>
                <a href={`/${locale}#services`} className="hover:text-foreground transition-colors">
                  {tNav("services")}
                </a>
                <a href={`/${locale}#projects`} className="hover:text-foreground transition-colors">
                  {tNav("projects")}
                </a>
                <a href={`/${locale}#about`} className="hover:text-foreground transition-colors">
                  {tNav("about")}
                </a>
              </div>
            </div>

            {/* Legal links */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Legal</h3>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <a href={`/${locale}/legal`} className="hover:text-foreground transition-colors">
                  {tFooter("legal")}
                </a>
                <a href={`/${locale}/privacy`} className="hover:text-foreground transition-colors">
                  {tFooter("privacy")}
                </a>
                <a href={`/${locale}/cookies`} className="hover:text-foreground transition-colors">
                  {tFooter("cookies")}
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Evolve2Digital. {tFooter("copyright")}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <a href={`/${locale}/legal`} className="hover:text-foreground transition-colors">
                {tFooter("legal")}
              </a>
              <a href={`/${locale}/privacy`} className="hover:text-foreground transition-colors">
                {tFooter("privacy")}
              </a>
              <a href={`/${locale}/cookies`} className="hover:text-foreground transition-colors">
                {tFooter("cookies")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
