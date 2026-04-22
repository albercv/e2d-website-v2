/**
 * Endpoint: POST /api/checkout_sessions/[id]
 * Propósito: Recalcular totales y devolver la sesión (simulada en memoria).
 * Body esperado:
 * {
 *   "items": [ { "productId": "agent_base_1500", "quantity": 1 } ] // opcional
 * }
 * Si no se pasa body, se usa la sesión almacenada.
 * Errores:
 * - 400 sesión inválida/no encontrada o entrada inválida
 * - 500 error interno
 *
 * Nota: Aquí se integrará Stripe para recuperar estado real de la Checkout Session.
 */

import { PRODUCTS_BY_ID } from "@/lib/merchant/products";
import { getSession, createSession, type CheckoutItemInput } from "@/lib/merchant/checkout-session-store";

type OutputItem = {
  product_id: string;
  title: string;
  unit_amount: number; // cents
  quantity: number;
};

function parsePriceToCents(price: string): number {
  const [currency, value] = price.split(" ");
  if (currency !== "EUR") throw new Error("unsupported_currency");
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) throw new Error("invalid_price_format");
  return Math.round(amount * 100);
}

function validateItemsOrUndefined(raw: unknown): CheckoutItemInput[] | undefined {
  if (!raw) return undefined;
  if (typeof raw !== "object") throw new Error("invalid_body");
  const obj = raw as { items?: unknown };
  if (obj.items === undefined) return undefined;
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

export async function POST(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const id = params.id;
    const incomingBody = await req.json().catch(() => undefined);
    const itemsOverride = validateItemsOrUndefined(incomingBody);

    const session = getSession(id);
    if (!session) {
      return new Response(JSON.stringify({ error: "bad_request", message: "invalid_session" }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    // Si llegan items nuevos, actualizamos la sesión en memoria (simulado)
    const effectiveItems = itemsOverride ?? session.items;
    if (itemsOverride) {
      createSession(id, effectiveItems, session.currency);
    }

    const outputItems: OutputItem[] = effectiveItems.map(({ productId, quantity }) => {
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

    const payload = {
      checkout_session_id: session.id,
      status: session.status,
      currency: session.currency,
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

export const dynamic = "force-dynamic";
