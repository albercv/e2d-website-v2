/**
 * Imagen placeholder: consultoria-mediana.jpg
 * Propósito: SVG ligero en ruta .jpg para evitar 404.
 */


export const dynamic = "force-static";

export async function GET() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stop-color="#a78bfa"/>
        <stop offset="100%" stop-color="#7c3aed"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell" font-size="40" font-weight="700">Consultoría – Mediana</text>
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
