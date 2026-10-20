import type React from "react"
import { HtmlDocument } from "@/components/layout/html-document"

// Solo envuelve las rutas de app/es/** (servicios/* y legal/devoluciones).
// La home /es la sirve app/[locale]/page.tsx con su propio layout, así que no hay solape.
export default function EsLayout({ children }: { children: React.ReactNode }) {
  return <HtmlDocument lang="es">{children}</HtmlDocument>
}
