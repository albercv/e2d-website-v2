// app/admin/media-upload/page.tsx
import { MediaUploadForm } from "./MediaUploadForm"

export const dynamic = "force-dynamic"

export default function MediaUploadPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold">Subir media</h1>
      <p className="mb-6 text-sm text-gray-500">
        Esta página requiere un token de subida emitido por el chat de Claude
        (<code>posts_request_upload</code>). El token es válido 15 minutos.
      </p>
      <MediaUploadForm />
    </main>
  )
}
