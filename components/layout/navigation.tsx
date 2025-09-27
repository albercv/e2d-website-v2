"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { LanguageSwitcher } from "./language-switcher"
import { motion, AnimatePresence } from "framer-motion"

export function Navigation() {
  const t = useTranslations("navigation")
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { key: "services", href: "#services" },
    { key: "projects", href: "#projects" },
    { key: "about", href: "#about" },
    { key: "blog", href: "/blog" },
    { key: "documentation", href: "/docs" },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="#" className="text-2xl font-bold text-foreground">
              E2D
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navItems.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium transition-colors"
                >
                  {t(item.key)}
                </a>
              ))}
            </div>
          </div>

          {/* Desktop CTA and Language */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSwitcher />
            <Button className="bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white">{t("contact")}</Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)} className="text-foreground">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground block px-3 py-2 text-base font-medium transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {t(item.key)}
                </a>
              ))}
              <div className="flex items-center space-x-4 px-3 py-2">
                <LanguageSwitcher />
                <Button className="bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white">{t("contact")}</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
