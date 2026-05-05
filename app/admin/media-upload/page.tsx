// app/admin/media-upload/page.tsx
// Esta ruta vive bajo app/admin/ (no app/[locale]/) porque es un endpoint
// puntual al que el usuario llega desde un link con JWT. NO usar Navigation
// ni Footer aquí: ambos componentes consumen useLocale/useTranslations de
// next-intl, que requieren el NextIntlClientProvider de app/[locale]/layout.
// Sin el provider los hooks tiran en runtime.
import { MediaUploadForm } from "./MediaUploadForm"

export const dynamic = "force-dynamic"

export default function MediaUploadPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="px-4 py-12">
        <div className="mx-auto max-w-3xl">
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
    </div>
  )
}
