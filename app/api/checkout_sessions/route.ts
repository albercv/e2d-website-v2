/**
 * Endpoint: POST /api/checkout_sessions
 * Propósito: Crear sesión de checkout ACP (sin Stripe).
 * Body esperado:
 * {
 *   "items": [ { "productId": "agent_base_1500", "quantity": 1 } ]
 * }
 * Respuesta (200):
 * {
 *   "checkout_session_id": "...",
 *   "status": "open",
 *   "currency": "EUR",
 *   "amount_total": 150000, // en cents
 *   "items": [
 *     { "product_id": "...", "title": "...", "unit_amount": 150000, "quantity": 1 }
 *   ]
 * }
 * Errores:
 * - 400 entrada inválida (producto inexistente, body malformado)
 * - 500 error interno
 *
 * Nota: Aquí se integrará Stripe (PaymentIntent/Checkout Session) más adelante.
 */

import { PRODUCTS_BY_ID } from "@/lib/merchant/products";
import { createSession, type CheckoutItemInput } from "@/lib/merchant/checkout-session-store";

type OutputItem = {
  product_id: string;
  title: string;
  unit_amount: number; // cents
  quantity: number;
};

function parsePriceToCents(price: string): number {
  // Esperado formato: "EUR 1500"
  const [currency, value] = price.split(" ");
  if (currency !== "EUR") throw new Error("unsupported_currency");
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) throw new Error("invalid_price_format");
  return Math.round(amount * 100);
}

function validateItems(raw: unknown): CheckoutItemInput[] {
  if (!raw || typeof raw !== "object") throw new Error("invalid_body");
  const obj = raw as { items?: unknown };
  if (!Array.isArray(obj.items)) throw new Error("invalid_items");
  const items = obj.items.map((it) => {
    if (!it || typeof it !== "object") throw new Error("invalid_item");
    const { productId, quantity } = it as { productId?: unknown; quantity?: unknown };
    if (typeof productId !== "string" || productId.length === 0) throw new Error("invalid_productId");
    const qty = typeof quantity === "number" ? quantity : Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) throw new Error("invalid_quantity");
    if (!PRODUCTS_BY_ID[productId]) throw new Error("product_not_found");
    return { productId, quantity: qty };
  });
  return items;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const items = validateItems(body);

    const outputItems: OutputItem[] = items.map(({ productId, quantity }) => {
      const product = PRODUCTS_BY_ID[productId];
      const unitCents = parsePriceToCents(product.price);
      return {
        product_id: product.id,
        title: product.title,
        unit_amount: unitCents,
        quantity,
      };
    });

    const amount_total = outputItems.reduce((acc, it) => acc + it.unit_amount * it.quantity, 0);
    const checkout_session_id = crypto.randomUUID();

    // Simular persistencia de la sesión (para el endpoint /[id])
    createSession(checkout_session_id, items, "EUR");

    const payload = {
      checkout_session_id,
      status: "open" as const,
      currency: "EUR" as const,
      amount_total,
      items: outputItems,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : undefined;
    if (
      message === "invalid_body" ||
      message === "invalid_items" ||
      message === "invalid_item" ||
      message === "invalid_productId" ||
      message === "invalid_quantity" ||
      message === "product_not_found"
    ) {
      return new Response(JSON.stringify({ error: "bad_request", message }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}

export const dynamic = "force-dynamic"; // POST no cacheable
