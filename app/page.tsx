import { permanentRedirect } from 'next/navigation'

// Forzar runtime dinámico: si Next prerendea esta ruta como estática, el
// .meta resultante puede perder el header `Location` y devolver 308 sin
// destino (pantalla en blanco en el navegador).
export const dynamic = 'force-dynamic'

export default function RootRedirect() {
  permanentRedirect('/es')
}