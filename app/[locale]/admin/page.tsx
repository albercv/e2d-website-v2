import { redirect } from "next/navigation"

export default function LocaleAdminRedirect() {
  // Redirige siempre al área admin no localizada
  redirect("/admin")
}