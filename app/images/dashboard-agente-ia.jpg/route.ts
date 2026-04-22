/**
 * Imagen placeholder: dashboard-agente-ia.jpg
 * Propósito: Placeholder SVG accesible en ruta .jpg para el feed.
 */


export const dynamic = "force-static";

export async function GET() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#f59e0b"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#111827" font-family="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell" font-size="40" font-weight="700">Dashboard Agente IA</text>
    <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="#1f2937" font-family="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell" font-size="22">Placeholder – 1200×630</text>
  </svg>`;
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
