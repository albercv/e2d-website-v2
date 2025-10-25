"use client"

import Image from "next/image"

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/80 backdrop-blur">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3">
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
            <a href="/blog" className="hover:text-foreground transition-colors">
              Blog
            </a>
            <a href="#services" className="hover:text-foreground transition-colors">
              Servicios
            </a>
            <a href="#projects" className="hover:text-foreground transition-colors">
              Proyectos
            </a>
            <a href="#about" className="hover:text-foreground transition-colors">
              Sobre mí
            </a>
            {/* Removed documentation link as requested */}
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} E2D. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
