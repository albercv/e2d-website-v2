/**
 * Endpoint: POST /api/checkout_sessions/[id]/complete
 * Propósito: Simular aceptación de pago y cerrar la sesión.
 * Respuesta (200):
 * {
 *   "checkout_session_id": "...",
 *   "status": "completed",
 *   "order_id": "order_...",
 *   "currency": "EUR",
 *   "amount_total": <cents>
 * }
 * Errores:
 * - 400 sesión inválida/no encontrada
 * - 500 error interno
 *
 * Nota: Aquí se integrará Stripe PaymentIntent / confirmación de pago.
 */

import { PRODUCTS_BY_ID } from "@/lib/merchant/products";
import { completeSession, getSession } from "@/lib/merchant/checkout-session-store";

function parsePriceToCents(price: string): number {
  const [currency, value] = price.split(" ");
  if (currency !== "EUR") throw new Error("unsupported_currency");
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) throw new Error("invalid_price_format");
  return Math.round(amount * 100);
}

export async function POST(_req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const id = params.id;
    const session = getSession(id);
    if (!session) {
      return new Response(JSON.stringify({ error: "bad_request", message: "invalid_session" }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    // Stripe: aquí se confirmaría el PaymentIntent asociado a la sesión
    const finalized = completeSession(id);
    if (!finalized) {
      return new Response(JSON.stringify({ error: "internal_error" }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const amount_total = finalized.items.reduce((acc, it) => {
      const product = PRODUCTS_BY_ID[it.productId];
      const unit = parsePriceToCents(product.price);
      return acc + unit * it.quantity;
    }, 0);

    const payload = {
      checkout_session_id: finalized.id,
      status: "completed" as const,
      order_id: `order_${finalized.id}`,
      currency: finalized.currency,
      amount_total,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}

export const dynamic = "force-dynamic";
