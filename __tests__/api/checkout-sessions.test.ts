/** @jest-environment node */

import { POST as createPOST } from "@/app/api/checkout_sessions/route";
import { POST as recalcPOST } from "@/app/api/checkout_sessions/[id]/route";
import { POST as completePOST } from "@/app/api/checkout_sessions/[id]/complete/route";

describe("ACP Checkout Sessions API", () => {
  const makeRequest = (url: string, body: unknown) =>
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("creates a session and returns expected payload", async () => {
    const req = makeRequest("http://localhost/api/checkout_sessions", {
      items: [{ productId: "agent_base_1500", quantity: 1 }],
    });
    const res = await createPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.checkout_session_id).toBe("string");
    expect(data.status).toBe("open");
    expect(data.currency).toBe("EUR");
    expect(data.amount_total).toBe(150000);
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items[0]).toMatchObject({
      product_id: "agent_base_1500",
      title: expect.any(String),
      unit_amount: 150000,
      quantity: 1,
    });
  });

  it("recalculates totals by session id (using stored items)", async () => {
    const createReq = makeRequest("http://localhost/api/checkout_sessions", {
      items: [
        { productId: "agent_base_1500", quantity: 1 },
        { productId: "agent_extra_integration_300", quantity: 2 },
      ],
    });
    const createRes = await createPOST(createReq);
    const created = await createRes.json();
    const id = created.checkout_session_id as string;

    const recalcReq = makeRequest(`http://localhost/api/checkout_sessions/${id}`, {});
    const recalcRes = await recalcPOST(recalcReq, { params: { id } });
    expect(recalcRes.status).toBe(200);
    const recalc = await recalcRes.json();
    // 1500*1 + 300*2 => (1500 + 600) * 100 = 210000 cents
    expect(recalc.amount_total).toBe(210000);
    expect(recalc.items.length).toBe(2);
  });

  it("allows updating items on recalc and reflects new totals", async () => {
    const createRes = await createPOST(
      makeRequest("http://localhost/api/checkout_sessions", {
        items: [{ productId: "consult_small_500", quantity: 1 }],
      })
    );
    const created = await createRes.json();
    const id = created.checkout_session_id as string;

    const recalcRes = await recalcPOST(
      makeRequest(`http://localhost/api/checkout_sessions/${id}`, {
        items: [
          { productId: "consult_medium_1500", quantity: 1 },
          { productId: "consult_large_3000", quantity: 1 },
        ],
      }),
      { params: { id } }
    );
    const recalc = await recalcRes.json();
    // 1500 + 3000 => 4500 * 100 = 450000 cents
    expect(recalc.amount_total).toBe(450000);
    expect(recalc.items.length).toBe(2);
  });

  it("completes session and returns final receipt", async () => {
    const createRes = await createPOST(
      makeRequest("http://localhost/api/checkout_sessions", {
        items: [{ productId: "agent_dashboard_1500", quantity: 1 }],
      })
    );
    const created = await createRes.json();
    const id = created.checkout_session_id as string;

    const completeRes = await completePOST(new Request(`http://localhost/api/checkout_sessions/${id}/complete`, { method: "POST" }), { params: { id } });
    expect(completeRes.status).toBe(200);
    const receipt = await completeRes.json();
    expect(receipt.status).toBe("completed");
    expect(receipt.amount_total).toBe(150000);
    expect(typeof receipt.order_id).toBe("string");
  });

  it("returns 400 for invalid product id", async () => {
    const res = await createPOST(
      makeRequest("http://localhost/api/checkout_sessions", {
        items: [{ productId: "nope", quantity: 1 }],
      })
    );
    expect(res.status).toBe(400);
    const err = await res.json();
    expect(err.error).toBe("bad_request");
  });

  it("returns 400 for invalid quantity", async () => {
    const res = await createPOST(
      makeRequest("http://localhost/api/checkout_sessions", {
        items: [{ productId: "agent_base_1500", quantity: 0 }],
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when session id does not exist", async () => {
    const res = await recalcPOST(new Request("http://localhost/api/checkout_sessions/invalid", { method: "POST" }), {
      params: { id: "invalid" },
    });
    expect(res.status).toBe(400);
  });

  it("500 on unexpected error (simulate JSON.stringify throw)", async () => {
    const originalStringify = JSON.stringify;
    // Only throw when stringifying the final payload
    JSON.stringify = ((value: unknown, ...rest: any[]) => {
      if (
        value &&
        typeof value === "object" &&
        // @ts-ignore
        (value as any).checkout_session_id
      ) {
        throw new Error("boom");
      }
      return originalStringify(value as any, ...rest);
    }) as unknown as typeof JSON.stringify;

    const res = await createPOST(
      new Request("http://localhost/api/checkout_sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ productId: "agent_base_1500", quantity: 1 }] }),
      })
    );
    expect(res.status).toBe(500);
    const err = await res.json();
    expect(err.error).toBe("internal_error");

    JSON.stringify = originalStringify;
  });
});
