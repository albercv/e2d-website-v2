import type { Metadata } from "next"
import CookiesClientPage from "./CookiesClientPage"

export const metadata: Metadata = {
  title: "Política de Cookies | E2D - Evolve2Digital",
  description:
    "Política de cookies de E2D. Información sobre el uso de cookies y tecnologías similares en nuestro sitio web.",
}

export default function CookiesPage() {
  return <CookiesClientPage />
}