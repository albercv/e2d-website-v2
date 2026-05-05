// app/admin/media-upload/page.tsx
import { Navigation } from "@/components/layout/navigation"
import { Footer } from "@/components/layout/footer"
import { MediaUploadForm } from "./MediaUploadForm"

export const dynamic = "force-dynamic"

export default function MediaUploadPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4">
          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Subir media
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta página requiere un token de subida emitido por el chat de Claude
              (<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">posts_request_upload</code>).
              El token es válido 15 minutos.
            </p>
          </header>
          <MediaUploadForm />
        </div>
      </main>
      <Footer />
    </div>
  )
}
