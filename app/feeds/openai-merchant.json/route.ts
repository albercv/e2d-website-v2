/**
 * Endpoint: /feeds/openai-merchant.json
 * Método: GET (público, sin autenticación)
 * Respuesta: JSON (array plano) con cabeceras cacheables
 * - Content-Type: application/json; charset=utf-8
 * - Cache-Control: public, max-age=900
 * En caso de error inesperado: 500 { "error": "internal_error" }
 * Side-effects: ninguno (lectura estática de datos en memoria)
 */

import { PRODUCTS } from '@/lib/merchant/products'

export async function GET(): Promise<Response> {
  try {
    const body = JSON.stringify(PRODUCTS);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=900",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=900",
      },
    });
  }
}

export const dynamic = "force-static";
