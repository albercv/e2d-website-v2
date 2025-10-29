"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip } from "react-tooltip"
import { Code, Database, Users, Zap, HelpCircle } from "lucide-react"
import { useComponentDebugLogger } from "@/lib/component-debug-logger"
import { Badge } from "@/components/ui/badge"
import 'react-tooltip/dist/react-tooltip.css'

const services = [
  {
    key: "web",
    icon: Code,
    color: "#05b4ba",
  },
  {
    key: "erp",
    icon: Database,
    color: "#293039",
  },
  {
    key: "crm",
    icon: Users,
    color: "#05b4ba",
  },
  {
    key: "automation",
    icon: Zap,
    color: "#293039",
  },
]

export function ServicesSection() {
  const t = useTranslations("services")
  const { renderCount } = useComponentDebugLogger("ServicesSection")

  return (
    <section id="services" className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">{t("title")}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">{t("subtitle")}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <motion.div
                key={service.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <Card className="h-full bg-card border-border hover:border-[#05b4ba]/50 transition-colors group">
                  <CardHeader className="text-center">
                    {service.key === "automation" && (
                      <Badge
                        variant="default"
                        className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white border-none"
                      >
                        + {t("automation.badge")}
                      </Badge>
                    )}
                    <div className="mx-auto mb-4 p-3 rounded-lg bg-muted group-hover:bg-[#05b4ba]/10 transition-colors">
                      <Icon className="h-8 w-8 text-[#05b4ba]" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-foreground flex items-center justify-center gap-2">
                      {t(`${service.key}.title`)}
                      {(service.key === "erp" || service.key === "crm" || service.key === "web" || service.key === "automation") && (
                        <>
                          <HelpCircle 
                            className="h-4 w-4 text-muted-foreground hover:text-[#05b4ba] cursor-help" 
                            data-tooltip-id={`tooltip-${service.key}`}
                            data-tooltip-content={t(`${service.key}.tooltip`)}
                          />
                          <Tooltip
                            id={`tooltip-${service.key}`}
                            place="top"
                            style={{
                              backgroundColor: 'rgba(5, 180, 186, 0.95)',
                              color: '#ffffff',
                              borderRadius: '12px',
                              padding: '12px 16px',
                              fontSize: '12px',
                              fontWeight: '500',
                              maxWidth: '280px',
                              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(5, 180, 186, 0.2)',
                              backdropFilter: 'blur(8px)',
                              border: '1px solid rgba(5, 180, 186, 0.3)',
                              zIndex: 9999
                            }}
                            opacity={1}
                            offset={8}
                            delayShow={200}
                            delayHide={100}
                            className="futuristic-tooltip"
                          />
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <CardDescription className="text-muted-foreground mb-6 text-pretty">
                      {t(`${service.key}.description`)}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
