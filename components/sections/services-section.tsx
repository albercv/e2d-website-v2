"use client"

import { useTranslations } from "next-intl"
import { LazyMotionDiv } from "@/components/performance/motion-optimized"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Code, Database, Users, Zap, HelpCircle } from "lucide-react"
import { useComponentDebugLogger } from "@/lib/component-debug-logger"
import { Badge } from "@/components/ui/badge"

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
        <LazyMotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">{t("title")}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">{t("subtitle")}</p>
        </LazyMotionDiv>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <LazyMotionDiv
                key={service.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    {/* Wrapper div: Card is a plain function component and cannot receive the trigger ref. */}
                    <div className="h-full" tabIndex={0}>
                      <Card className="h-full bg-card border-border hover:border-[#05b4ba]/50 transition-colors group cursor-pointer">
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
                          <CardTitle className="text-xl font-semibold text-foreground">
                            {t(`${service.key}.title`)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                          <CardDescription className="text-muted-foreground mb-6 text-pretty">
                            {t(`${service.key}.description`)}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={8}
                    className="max-w-[280px] rounded-xl border border-[#05b4ba]/30 bg-[#05b4ba]/95 px-4 py-3 text-xs font-medium text-white shadow-xl backdrop-blur"
                    arrowClassName="bg-[#05b4ba] fill-[#05b4ba]"
                  >
                    {t(`${service.key}.tooltip`)}
                  </TooltipContent>
                </Tooltip>
              </LazyMotionDiv>
            )
          })}
        </div>
      </div>
    </section>
  )
}
