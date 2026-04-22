/**
 * Store en memoria para sesiones de checkout ACP.
 * Propósito: simular persistencia mínima entre endpoints mientras se integra Stripe.
 * Entradas: createSession(items), getSession(id), completeSession(id).
 * Salidas: datos de sesión almacenados.
 * Side-effects: mutación del Map en memoria del proceso.
 */

export type CheckoutItemInput = {
  productId: string;
  quantity: number;
};

export type CheckoutSessionData = {
  id: string;
  status: "open" | "completed";
  currency: "EUR";
  items: CheckoutItemInput[];
};

const SESSIONS = new Map<string, CheckoutSessionData>();

export function createSession(id: string, items: CheckoutItemInput[], currency: "EUR" = "EUR"): CheckoutSessionData {
  const session: CheckoutSessionData = {
    id,
    status: "open",
    currency,
    items,
  };
  SESSIONS.set(id, session);
  return session;
}

export function getSession(id: string): CheckoutSessionData | undefined {
  return SESSIONS.get(id);
}

export function completeSession(id: string): CheckoutSessionData | undefined {
  const s = SESSIONS.get(id);
  if (!s) return undefined;
  const updated: CheckoutSessionData = { ...s, status: "completed" };
  SESSIONS.set(id, updated);
  return updated;
}

