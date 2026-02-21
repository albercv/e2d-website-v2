/**
 * Imagen placeholder: consultoria-pequena.jpg
 * Propósito: Evitar 404 con SVG ligero accesible desde ruta .jpg.
 */


export const dynamic = "force-static";

export async function GET() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="g" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#14b8a6"/>
        <stop offset="100%" stop-color="#0f766e"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell" font-size="40" font-weight="700">Consultoría – Pequeña</text>
    <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="#e5e7eb" font-family="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell" font-size="22">Placeholder – 1200×630</text>
  </svg>`;
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
