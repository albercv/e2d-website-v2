"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Info, Code } from "lucide-react"

interface DocsContentProps {
  locale: string
  slug: string
}

export function DocsContent({ locale, slug }: DocsContentProps) {
  const content = getContentForSlug(slug, locale)

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 text-balance">{content.title}</h1>
          <p className="text-lg text-muted-foreground text-pretty">{content.description}</p>
        </div>

        <div className="prose prose-lg prose-invert max-w-none">
          <content.component />
        </div>
      </motion.div>
    </div>
  )
}

function getContentForSlug(slug: string, locale: string) {
  const contents = {
    principles: {
      es: {
        title: "Principios de Desarrollo",
        description: "Fundamentos y mejores prácticas que guían el desarrollo del proyecto E2D",
        component: PrinciplesContentES,
      },
      en: {
        title: "Development Principles",
        description: "Fundamentals and best practices that guide E2D project development",
        component: PrinciplesContentEN,
      },
    },
    architecture: {
      es: {
        title: "Arquitectura del Sistema",
        description: "Estructura, patrones y organización del código en el proyecto E2D",
        component: ArchitectureContentES,
      },
      en: {
        title: "System Architecture",
        description: "Structure, patterns and code organization in the E2D project",
        component: ArchitectureContentEN,
      },
    },
    components: {
      es: {
        title: "Guía de Componentes",
        description: "Documentación completa de todos los componentes del sistema",
        component: ComponentsContentES,
      },
      en: {
        title: "Components Guide",
        description: "Complete documentation of all system components",
        component: ComponentsContentEN,
      },
    },
    i18n: {
      es: {
        title: "Internacionalización",
        description: "Configuración y gestión de múltiples idiomas en el proyecto",
        component: I18nContentES,
      },
      en: {
        title: "Internationalization",
        description: "Configuration and management of multiple languages in the project",
        component: I18nContentEN,
      },
    },
    seo: {
      es: {
        title: "SEO y Metadatos",
        description: "Optimización para motores de búsqueda y metadatos estructurados",
        component: SEOContentES,
      },
      en: {
        title: "SEO and Metadata",
        description: "Search engine optimization and structured metadata",
        component: SEOContentEN,
      },
    },
    gdpr: {
      es: {
        title: "Cumplimiento GDPR",
        description: "Implementación de privacidad y protección de datos",
        component: GDPRContentES,
      },
      en: {
        title: "GDPR Compliance",
        description: "Privacy and data protection implementation",
        component: GDPRContentEN,
      },
    },
    performance: {
      es: {
        title: "Optimización de Performance",
        description: "Técnicas y estrategias para maximizar el rendimiento",
        component: PerformanceContentES,
      },
      en: {
        title: "Performance Optimization",
        description: "Techniques and strategies to maximize performance",
        component: PerformanceContentEN,
      },
    },
    deployment: {
      es: {
        title: "Despliegue y Producción",
        description: "Guía para llevar el proyecto a producción",
        component: DeploymentContentES,
      },
      en: {
        title: "Deployment and Production",
        description: "Guide to take the project to production",
        component: DeploymentContentEN,
      },
    },
  }

  const slugContent = contents[slug as keyof typeof contents]
  const localeContent = slugContent?.[locale as keyof typeof slugContent] || slugContent?.es

  return localeContent || contents.principles.es
}

// Content Components
function PrinciplesContentES() {
  return (
    <div className="space-y-8">
      <Alert className="border-[#05b4ba]/20 bg-[#05b4ba]/5">
        <Info className="h-4 w-4 text-[#05b4ba]" />
        <AlertDescription className="text-[#05b4ba]">
          Estos principios son la base de todas las decisiones de desarrollo en el proyecto E2D.
        </AlertDescription>
      </Alert>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Principios SOLID</h2>
        <div className="grid gap-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                Single Responsibility Principle (SRP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Cada componente y función tiene una única responsabilidad bien definida. Los componentes de UI se
                enfocan solo en la presentación, mientras que la lógica de negocio se mantiene separada.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                Open/Closed Principle (OCP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Los componentes están abiertos para extensión pero cerrados para modificación. Utilizamos composition
                patterns y props para extender funcionalidad sin modificar código existente.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                Dependency Inversion Principle (DIP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Los módulos de alto nivel no dependen de módulos de bajo nivel. Ambos dependen de abstracciones a través
                de interfaces y tipos TypeScript bien definidos.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Clean Code</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-[#05b4ba] mt-2 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground mb-2">Nombres Descriptivos</h3>
              <p className="text-muted-foreground">
                Variables, funciones y componentes tienen nombres que expresan claramente su propósito sin necesidad de
                comentarios adicionales.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-[#05b4ba] mt-2 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground mb-2">Funciones Pequeñas</h3>
              <p className="text-muted-foreground">
                Las funciones hacen una sola cosa y la hacen bien. Máximo 20 líneas por función, con parámetros
                limitados y sin efectos secundarios ocultos.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-[#05b4ba] mt-2 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground mb-2">Comentarios Mínimos</h3>
              <p className="text-muted-foreground">
                El código se autodocumenta. Los comentarios solo explican el "por qué", nunca el "qué" o el "cómo".
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">DRY, KISS, YAGNI</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-[#05b4ba]">DRY</CardTitle>
              <CardDescription>Don't Repeat Yourself</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cada pieza de conocimiento debe tener una representación única y autoritativa en el sistema.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-[#05b4ba]">KISS</CardTitle>
              <CardDescription>Keep It Simple, Stupid</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                La simplicidad es la máxima sofisticación. Evitamos complejidad innecesaria en favor de soluciones
                claras.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-[#05b4ba]">YAGNI</CardTitle>
              <CardDescription>You Aren't Gonna Need It</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No implementamos funcionalidad hasta que sea realmente necesaria. Evitamos la sobre-ingeniería.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

function PrinciplesContentEN() {
  return (
    <div className="space-y-8">
      <Alert className="border-[#05b4ba]/20 bg-[#05b4ba]/5">
        <Info className="h-4 w-4 text-[#05b4ba]" />
        <AlertDescription className="text-[#05b4ba]">
          These principles are the foundation of all development decisions in the E2D project.
        </AlertDescription>
      </Alert>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">SOLID Principles</h2>
        <div className="grid gap-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                Single Responsibility Principle (SRP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Each component and function has a single, well-defined responsibility. UI components focus only on
                presentation, while business logic is kept separate.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                Open/Closed Principle (OCP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Components are open for extension but closed for modification. We use composition patterns and props to
                extend functionality without modifying existing code.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                Dependency Inversion Principle (DIP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                High-level modules do not depend on low-level modules. Both depend on abstractions through well-defined
                TypeScript interfaces and types.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Clean Code</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-[#05b4ba] mt-2 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground mb-2">Descriptive Names</h3>
              <p className="text-muted-foreground">
                Variables, functions and components have names that clearly express their purpose without needing
                additional comments.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-[#05b4ba] mt-2 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground mb-2">Small Functions</h3>
              <p className="text-muted-foreground">
                Functions do one thing and do it well. Maximum 20 lines per function, with limited parameters and no
                hidden side effects.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-[#05b4ba] mt-2 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground mb-2">Minimal Comments</h3>
              <p className="text-muted-foreground">
                Code is self-documenting. Comments only explain the "why", never the "what" or "how".
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">DRY, KISS, YAGNI</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-[#05b4ba]">DRY</CardTitle>
              <CardDescription>Don't Repeat Yourself</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Every piece of knowledge must have a single, unambiguous, authoritative representation within a system.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-[#05b4ba]">KISS</CardTitle>
              <CardDescription>Keep It Simple, Stupid</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Simplicity is the ultimate sophistication. We avoid unnecessary complexity in favor of clear solutions.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-[#05b4ba]">YAGNI</CardTitle>
              <CardDescription>You Aren't Gonna Need It</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We don't implement functionality until it's actually needed. We avoid over-engineering.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

function ArchitectureContentES() {
  return (
    <div className="space-y-8">
      <Alert className="border-[#05b4ba]/20 bg-[#05b4ba]/5">
        <Code className="h-4 w-4 text-[#05b4ba]" />
        <AlertDescription className="text-[#05b4ba]">
          La arquitectura sigue los principios de Clean Architecture con separación clara de responsabilidades.
        </AlertDescription>
      </Alert>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Estructura de Capas</h2>
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-[#05b4ba]">Capa de Presentación</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Componentes React, páginas Next.js y elementos de UI. Se encarga únicamente de mostrar datos y capturar
                interacciones del usuario.
              </p>
              <div className="bg-muted p-3 rounded text-sm font-mono">
                <div>app/ - Páginas y layouts de Next.js</div>
                <div>components/ - Componentes reutilizables</div>
                <div>components/ui/ - Componentes base de shadcn/ui</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-[#05b4ba]">Capa de Dominio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Lógica de negocio, tipos TypeScript y reglas de validación. Independiente de frameworks y librerías
                externas.
              </p>
              <div className="bg-muted p-3 rounded text-sm font-mono">
                <div>types/ - Interfaces y tipos TypeScript</div>
                <div>lib/ - Utilidades y lógica de negocio</div>
                <div>hooks/ - Custom hooks de React</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-[#05b4ba]">Capa de Datos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Acceso a APIs, bases de datos y servicios externos. Implementa interfaces definidas en la capa de
                dominio.
              </p>
              <div className="bg-muted p-3 rounded text-sm font-mono">
                <div>api/ - Route handlers de Next.js</div>
                <div>services/ - Servicios externos</div>
                <div>content/ - Contenido MDX del blog</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Patrones de Diseño</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Container-Presenter</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Separación entre componentes que manejan lógica (containers) y componentes que solo presentan datos
                (presenters).
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Composition over Inheritance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Uso de composition patterns de React para crear componentes flexibles y reutilizables.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Repository Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Abstracción del acceso a datos a través de interfaces bien definidas para facilitar testing y
                mantenimiento.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Factory Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Creación de objetos complejos (como clientes de API) a través de factories que encapsulan la lógica de
                construcción.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

function ArchitectureContentEN() {
  return (
    <div className="space-y-8">
      <Alert className="border-[#05b4ba]/20 bg-[#05b4ba]/5">
        <Code className="h-4 w-4 text-[#05b4ba]" />
        <AlertDescription className="text-[#05b4ba]">
          The architecture follows Clean Architecture principles with clear separation of concerns.
        </AlertDescription>
      </Alert>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Layer Structure</h2>
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-[#05b4ba]">Presentation Layer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                React components, Next.js pages and UI elements. Only responsible for displaying data and capturing user
                interactions.
              </p>
              <div className="bg-muted p-3 rounded text-sm font-mono">
                <div>app/ - Next.js pages and layouts</div>
                <div>components/ - Reusable components</div>
                <div>components/ui/ - Base shadcn/ui components</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-[#05b4ba]">Domain Layer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Business logic, TypeScript types and validation rules. Independent of frameworks and external libraries.
              </p>
              <div className="bg-muted p-3 rounded text-sm font-mono">
                <div>types/ - TypeScript interfaces and types</div>
                <div>lib/ - Utilities and business logic</div>
                <div>hooks/ - Custom React hooks</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-[#05b4ba]">Data Layer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                API access, databases and external services. Implements interfaces defined in the domain layer.
              </p>
              <div className="bg-muted p-3 rounded text-sm font-mono">
                <div>api/ - Next.js route handlers</div>
                <div>services/ - External services</div>
                <div>content/ - Blog MDX content</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Design Patterns</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Container-Presenter</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Separation between components that handle logic (containers) and components that only present data
                (presenters).
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Composition over Inheritance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Use of React composition patterns to create flexible and reusable components.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Repository Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Data access abstraction through well-defined interfaces to facilitate testing and maintenance.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Factory Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Creation of complex objects (like API clients) through factories that encapsulate construction logic.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

// Placeholder components for other content types
function ComponentsContentES() {
  return <div>Contenido de componentes en español...</div>
}

function ComponentsContentEN() {
  return <div>Components content in English...</div>
}

function I18nContentES() {
  return <div>Contenido de i18n en español...</div>
}

function I18nContentEN() {
  return <div>i18n content in English...</div>
}

function SEOContentES() {
  return <div>Contenido de SEO en español...</div>
}

function SEOContentEN() {
  return <div>SEO content in English...</div>
}

function GDPRContentES() {
  return <div>Contenido de GDPR en español...</div>
}

function GDPRContentEN() {
  return <div>GDPR content in English...</div>
}

function PerformanceContentES() {
  return <div>Contenido de performance en español...</div>
}

function PerformanceContentEN() {
  return <div>Performance content in English...</div>
}

function DeploymentContentES() {
  return <div>Contenido de deployment en español...</div>
}

function DeploymentContentEN() {
  return <div>Deployment content in English...</div>
}
