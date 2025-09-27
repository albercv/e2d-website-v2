"use client"

import { useEffect } from 'react'

/**
 * Debug Provider Component
 * 
 * Componente cliente que inicializa los sistemas de debug
 * solo en el lado del cliente para evitar problemas con Server Components.
 */
export function DebugProvider() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Importar dinámicamente el inicializador de debug solo en el cliente
      import('@/lib/debug-initializer').catch(console.error)
    }
  }, [])

  // Este componente no renderiza nada, solo inicializa el debug
  return null
}