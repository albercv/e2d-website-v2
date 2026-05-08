import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react"
import type { MDXComponents as MDXComponentsType } from "mdx/types"
import { MediaMissing } from "./MediaMissing"
import { ContactCTA } from "./ContactCTA"

// Pros/Cons Component
function ProsConsComponent({ pros, cons }: { pros: string[]; cons: string[] }) {
  return (
    <div className="grid md:grid-cols-2 gap-6 my-8">
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-400">
            <CheckCircle className="h-5 w-5" />
            Ventajas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {pros.map((pro, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{pro}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-red-500/20 bg-red-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <XCircle className="h-5 w-5" />
            Desventajas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {cons.map((con, index) => (
              <li key={index} className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{con}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// Callout Component
function CalloutComponent({
  type = "info",
  title,
  children,
}: {
  type?: "info" | "warning" | "success" | "error"
  title?: string
  children: React.ReactNode
}) {
  const icons = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
    error: XCircle,
  }

  const colors = {
    info: "border-blue-500/20 bg-blue-500/5 text-blue-400",
    warning: "border-yellow-500/20 bg-yellow-500/5 text-yellow-400",
    success: "border-green-500/20 bg-green-500/5 text-green-400",
    error: "border-red-500/20 bg-red-500/5 text-red-400",
  }

  const Icon = icons[type]

  return (
    <Alert className={`my-6 ${colors[type]}`}>
      <Icon className="h-4 w-4" />
      {title && <AlertDescription className="font-semibold mb-2">{title}</AlertDescription>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

// CTA Inline Component
function CTAInlineComponent({ text, href }: { text: string; href: string }) {
  return (
    <div className="my-8 p-6 bg-[#05b4ba]/10 border border-[#05b4ba]/20 rounded-lg text-center">
      <p className="text-lg font-medium text-foreground mb-4">{text}</p>
      <Button asChild className="bg-[#05b4ba] hover:bg-[#05b4ba]/90 text-white">
        <a href={href}>Reservar demo</a>
      </Button>
    </div>
  )
}

// Code Block Component
function CodeBlockComponent({ children, language }: { children: string; language?: string }) {
  return (
    <div className="my-6">
      {language && (
        <div className="bg-muted px-4 py-2 text-sm text-muted-foreground border-b border-border rounded-t-lg">
          {language}
        </div>
      )}
      <pre className="bg-muted p-4 rounded-b-lg overflow-x-auto">
        <code className="text-sm">{children}</code>
      </pre>
    </div>
  )
}

// Lead — primer párrafo destacado, ideal después del título
function LeadComponent({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xl leading-relaxed text-foreground/85 font-light tracking-tight mb-8 first:mt-0 not-prose">
      {children}
    </p>
  )
}

// Pull quote — cita destacada estilo editorial
function PullQuoteComponent({ children, author }: { children: React.ReactNode; author?: string }) {
  return (
    <figure className="my-12 border-l-4 border-[#05b4ba] pl-6 py-2 not-prose">
      <blockquote className="text-2xl leading-snug font-light text-foreground italic">
        &ldquo;{children}&rdquo;
      </blockquote>
      {author && (
        <figcaption className="mt-3 text-sm text-muted-foreground not-italic">— {author}</figcaption>
      )}
    </figure>
  )
}

// Figure — imagen + caption, para usar dentro del flujo MDX
function FigureComponent({
  src,
  alt,
  caption,
}: {
  src: string
  alt: string
  caption?: string
}) {
  return (
    <figure className="my-10 not-prose">
      <img
        src={src}
        alt={alt}
        className="w-full rounded-xl ring-1 ring-border shadow-xl shadow-black/30"
      />
      {caption && (
        <figcaption className="mt-3 text-center text-sm text-muted-foreground italic">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

// Stat — número grande con etiqueta. Ideal para resultados cuantificables
function StatComponent({ value, label }: { value: string; label: string }) {
  return (
    <div className="my-4 inline-flex flex-col items-start rounded-lg border border-border bg-muted/30 px-6 py-4 not-prose">
      <span className="text-3xl font-bold text-[#05b4ba] leading-none">{value}</span>
      <span className="mt-1 text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

export const MDXComponents: MDXComponentsType = {
  // Custom components
  ProsCons: ProsConsComponent,
  Callout: CalloutComponent,
  CTAInline: CTAInlineComponent,
  CodeBlock: CodeBlockComponent,
  Lead: LeadComponent,
  PullQuote: PullQuoteComponent,
  Figure: FigureComponent,
  Stat: StatComponent,
  MediaMissing,
  ContactCTA,

  // Override default elements — los estilos base los maneja el wrapper `prose`
  // del blog-post.tsx (Tailwind typography). Aquí solo afinamos lo que prose
  // no acaba de cubrir bien o sobreescribimos con paleta brand.
  h1: ({ children }) => (
    <h1 className="text-3xl font-bold text-foreground mt-10 mb-4 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-2xl font-semibold text-foreground mt-10 mb-4 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl font-semibold text-foreground mt-7 mb-3 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-foreground/90 mb-5 leading-[1.75] hyphens-auto" style={{ textAlign: "justify" }}>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-6 mb-5 space-y-2 text-foreground/90 marker:text-[#05b4ba]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-6 mb-5 space-y-2 text-foreground/90 marker:text-[#05b4ba] marker:font-semibold">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-[1.75] pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-7 border-l-4 border-[#05b4ba] bg-muted/30 pl-5 py-3 pr-4 rounded-r italic text-foreground/85">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground border border-border/50">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-muted/50 border border-border p-4 rounded-lg overflow-x-auto my-6 text-sm">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-10 border-border/50" />,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-[#05b4ba] hover:text-[#05b4ba]/80 underline-offset-4 decoration-[#05b4ba]/30 hover:decoration-[#05b4ba] underline"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground/95">{children}</em>,
}
