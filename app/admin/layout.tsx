import type React from "react"
import { HtmlDocument } from "@/components/layout/html-document"

// El panel de administración queda fuera de [locale] y es solo en español;
// como app/layout.tsx ya no renderiza <html>, este árbol monta su propio documento.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <HtmlDocument lang="es">{children}</HtmlDocument>
}
