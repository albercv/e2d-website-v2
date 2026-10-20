import Link from "next/link"
import { HtmlDocument } from "@/components/layout/html-document"

// Las URLs que no casan con ninguna ruta se renderizan bajo el layout raíz de
// paso (sin <html>), así que el 404 trae su propio documento. No conoce el
// locale de la URL pedida, por eso es siempre español.
export default function NotFound() {
  return (
    <HtmlDocument lang="es">
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Error 404</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Página no encontrada</h1>
        <p className="max-w-md text-muted-foreground">
          La página que buscas no existe o ha cambiado de dirección.
        </p>
        <Link
          href="/es"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Volver al inicio
        </Link>
      </main>
    </HtmlDocument>
  )
}
