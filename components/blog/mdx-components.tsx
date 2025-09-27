import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react"
import type { MDXComponents as MDXComponentsType } from "mdx/types"

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

export const MDXComponents: MDXComponentsType = {
  // Custom components
  ProsCons: ProsConsComponent,
  Callout: CalloutComponent,
  CTAInline: CTAInlineComponent,
  CodeBlock: CodeBlockComponent,

  // Override default elements
  h1: ({ children }) => <h1 className="text-3xl font-bold text-foreground mt-8 mb-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">{children}</h3>,
  p: ({ children }) => <p className="text-muted-foreground mb-4 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2 text-muted-foreground">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2 text-muted-foreground">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-[#05b4ba] pl-4 my-6 italic text-muted-foreground">{children}</blockquote>
  ),
  code: ({ children }) => (
    <code className="bg-muted px-2 py-1 rounded text-sm font-mono text-foreground">{children}</code>
  ),
  pre: ({ children }) => <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-6">{children}</pre>,
  a: ({ href, children }) => (
    <a href={href} className="text-[#05b4ba] hover:text-[#05b4ba]/80 underline">
      {children}
    </a>
  ),
}
