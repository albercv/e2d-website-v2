import type React from "react"
import { HtmlDocument } from "@/components/layout/html-document"

// La pantalla de consentimiento OAuth queda fuera de [locale] y es solo en español;
// como app/layout.tsx ya no renderiza <html>, este árbol monta su propio documento.
export default function AuthorizeLayout({ children }: { children: React.ReactNode }) {
  return <HtmlDocument lang="es">{children}</HtmlDocument>
}
