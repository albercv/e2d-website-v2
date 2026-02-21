/**
 * Endpoint: /images/agent-dashboard.png
 * Método: GET
 * Respuesta: image/png (placeholder 1x1 transparente) con cache largo
 */

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBBUeSfi8AAAAASUVORK5CYII=";

export async function GET(): Promise<Response> {
  const body = Uint8Array.from(Buffer.from(PNG_BASE64, "base64"));
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export const dynamic = "force-static";

