/**
 * Tests de integración: rutas /images/*.jpg placeholders
 * Verifica status 200, Content-Type image/svg+xml y contenido SVG.
 */
import { describe, expect, it } from "@jest/globals";

class ResponseMock {
  status: number;
  headers: { get: (k: string) => string | null };
  private _body: unknown;
  constructor(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
    this._body = body;
    this.status = init.status ?? 200;
    const hdrs = init.headers ?? {};
    this.headers = {
      get: (k: string) => {
        const key = Object.keys(hdrs).find((kk) => kk.toLowerCase() === k.toLowerCase());
        return key ? hdrs[key] : null;
      },
    };
  }
  async text(): Promise<string> {
    if (typeof this._body === "string") return this._body;
    if (this._body instanceof Uint8Array) {
      const dec = new TextDecoder();
      return dec.decode(this._body);
    }
    return "";
  }
}
(globalThis as unknown as { Response: typeof ResponseMock }).Response = ResponseMock;

import { GET as GET_CHATBOT } from "@/app/images/agente-ia-chatbot.jpg/route";
import { GET as GET_INTEGRACION } from "@/app/images/agente-extra-integracion.jpg/route";
import { GET as GET_DASHBOARD } from "@/app/images/dashboard-agente-ia.jpg/route";
import { GET as GET_CONS_PEQ } from "@/app/images/consultoria-pequena.jpg/route";
import { GET as GET_CONS_MED } from "@/app/images/consultoria-mediana.jpg/route";
import { GET as GET_CONS_GRA } from "@/app/images/consultoria-grande.jpg/route";

async function readText(res: { text: () => Promise<string> }) {
  return await res.text();
}

describe("Placeholders de imágenes (.jpg) devuelven 200 y SVG", () => {
  it("/images/agente-ia-chatbot.jpg", async () => {
    const res = await GET_CHATBOT();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/image\/svg\+xml/i);
    const body = await readText(res);
    expect(body).toContain("Agente IA Chatbot");
    expect(body).toContain("<svg");
  });

  it("/images/agente-extra-integracion.jpg", async () => {
    const res = await GET_INTEGRACION();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/image\/svg\+xml/i);
    const body = await readText(res);
    expect(body).toContain("Integración de Agentes IA");
    expect(body).toContain("<svg");
  });

  it("/images/dashboard-agente-ia.jpg", async () => {
    const res = await GET_DASHBOARD();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/image\/svg\+xml/i);
    const body = await readText(res);
    expect(body).toContain("Dashboard Agente IA");
    expect(body).toContain("<svg");
  });

  it("/images/consultoria-pequena.jpg", async () => {
    const res = await GET_CONS_PEQ();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/image\/svg\+xml/i);
    const body = await readText(res);
    expect(body).toContain("Consultoría – Pequeña");
    expect(body).toContain("<svg");
  });

  it("/images/consultoria-mediana.jpg", async () => {
    const res = await GET_CONS_MED();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/image\/svg\+xml/i);
    const body = await readText(res);
    expect(body).toContain("Consultoría – Mediana");
    expect(body).toContain("<svg");
  });

  it("/images/consultoria-grande.jpg", async () => {
    const res = await GET_CONS_GRA();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/image\/svg\+xml/i);
    const body = await readText(res);
    expect(body).toContain("Consultoría – Grande");
    expect(body).toContain("<svg");
  });
});
