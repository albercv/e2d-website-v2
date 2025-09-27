"use client"

import { useTranslations } from "next-intl"
import { Mail, Phone, MapPin } from "lucide-react"
import { LanguageSwitcher } from "./language-switcher"

export function Footer() {
  const t = useTranslations("footer")

  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="text-2xl font-bold text-foreground">E2D</div>
            <p className="text-sm text-muted-foreground">
              Automatiza tu PYME: más ventas, menos tareas. Especialistas en voicebots, WhatsApp bots y
              automatizaciones.
            </p>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Servicios</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#services" className="hover:text-foreground transition-colors">
                  Desarrollo Web
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-foreground transition-colors">
                  Sistemas ERP
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-foreground transition-colors">
                  CRM Personalizado
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-foreground transition-colors">
                  Automatizaciones
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Recursos</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/blog" className="hover:text-foreground transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="/docs" className="hover:text-foreground transition-colors">
                  Documentación
                </a>
              </li>
              <li>
                <a href="#projects" className="hover:text-foreground transition-colors">
                  Casos de éxito
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-foreground transition-colors">
                  Sobre mí
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Contacto</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:hello@evolve2digital.com" className="hover:text-foreground transition-colors">
                  {t("contact")}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>+34 600 000 000</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>España</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © 2025 E2D - Evolve2Digital. Todos los derechos reservados.
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="/legal" className="hover:text-foreground transition-colors">
              {t("legal")}
            </a>
            <a href="/privacy" className="hover:text-foreground transition-colors">
              {t("privacy")}
            </a>
            <a href="/cookies" className="hover:text-foreground transition-colors">
              {t("cookies")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
