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
        <div className="py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
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
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
            {/* Removed documentation link as requested */}
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} E2D. {tFooter("copyright")}</p>
        </div>
      </div>
    </footer>
  )
}
