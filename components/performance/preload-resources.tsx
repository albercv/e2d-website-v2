"use client"

// Preload hints for critical assets
// Docstring: Este módulo inyecta preloads para assets críticos. Efecto lateral: inserta <link rel="preload"> en head.

export function PreloadResources() {
  // Mantener pequeño para no saturar conexiones móviles
  const imagePreloads = ["/AlbertoCarrasco_pic.webp"]

  return (
    <>
      {imagePreloads.map((src) => (
        <link key={src} rel="preload" as="image" href={src} />
      ))}
      {/* Prefetch páginas clave si es necesario */}
      {/* const prefetchPages = ["/es/blog", "/en/blog"] */}
    </>
  )
}
