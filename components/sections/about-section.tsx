"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Github, Linkedin, Mail, Award, Users, Zap } from "lucide-react"
import Image from "next/image"

const skills = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "Python",
  "n8n",
  "Supabase",
  "PostgreSQL",
  "OpenAI",
  "WhatsApp API",
  "Vercel",
  "AWS",
  "Docker",
  "GDPR",
  "SEO",
]

const achievements = [
  { icon: Users, value: "50+", label: "PYMEs automatizadas" },
  { icon: Zap, value: "28%", label: "Reducción promedio no-shows" },
  { icon: Award, value: "340%", label: "ROI promedio proyectos" },
]

export function AboutSection() {
  const t = useTranslations("about")

  return (
    <section id="about" className="py-24 bg-background">
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

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Profile Image and Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center lg:text-left"
          >
            <div className="relative w-64 h-64 mx-auto lg:mx-0 mb-8">
              <Image
                src="/professional-headshot-alberto-carrasco.jpg"
                alt="Alberto Carrasco"
                width={256}
                height={256}
                className="rounded-full object-cover border-4 border-[#05b4ba]/20"
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#05b4ba]/20 to-transparent" />
            </div>

            <h3 className="text-2xl font-bold text-foreground mb-2">Alberto Carrasco</h3>
            <p className="text-lg text-[#05b4ba] mb-4">Full-Stack Architect & Automation Specialist</p>
            <p className="text-muted-foreground mb-6 text-pretty">{t("description")}</p>

            {/* Social Links */}
            <div className="flex justify-center lg:justify-start gap-4 mb-8">
              <Button
                variant="outline"
                size="sm"
                className="border-[#05b4ba] text-[#05b4ba] hover:bg-[#05b4ba]/10 bg-transparent"
              >
                <Github className="h-4 w-4 mr-2" />
                GitHub
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#05b4ba] text-[#05b4ba] hover:bg-[#05b4ba]/10 bg-transparent"
              >
                <Linkedin className="h-4 w-4 mr-2" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#05b4ba] text-[#05b4ba] hover:bg-[#05b4ba]/10 bg-transparent"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>

            {/* Skills */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Tecnologías y herramientas</h4>
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="bg-muted text-muted-foreground">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Achievements and Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {/* Achievement Cards */}
            <div className="grid gap-4">
              {achievements.map((achievement, index) => {
                const Icon = achievement.icon
                return (
                  <Card key={index} className="bg-card border-border">
                    <CardContent className="flex items-center p-6">
                      <div className="p-3 rounded-lg bg-[#05b4ba]/10 mr-4">
                        <Icon className="h-6 w-6 text-[#05b4ba]" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">{achievement.value}</div>
                        <div className="text-sm text-muted-foreground">{achievement.label}</div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Approach */}
            <Card className="bg-muted/30 border-border">
              <CardContent className="p-6">
                <h4 className="text-lg font-semibold text-foreground mb-4">Mi enfoque</h4>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#05b4ba] mt-2 flex-shrink-0" />
                    <span>ROI-first: Cada automatización debe generar valor medible</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#05b4ba] mt-2 flex-shrink-0" />
                    <span>GDPR compliant: Cumplimiento normativo desde el diseño</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#05b4ba] mt-2 flex-shrink-0" />
                    <span>Escalable: Soluciones que crecen con tu negocio</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#05b4ba] mt-2 flex-shrink-0" />
                    <span>Soporte continuo: Acompañamiento post-implementación</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="text-center lg:text-left">
              <Button className="bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white px-8 py-3">Trabajemos juntos</Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
