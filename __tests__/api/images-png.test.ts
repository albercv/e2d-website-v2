/** @jest-environment jsdom */
/**
 * Tests de integración: rutas /images/*.png placeholders
 * Verifica status 200, Content-Type image/png y firma PNG.
 */
import { describe, expect, it } from "@jest/globals";

// Polyfill mínimo de Response para entorno Node/jsdom en estos tests
class ResponseMock {
  status: number;
  headers: { get: (k: string) => string | null };
  private _body: any;
  constructor(body: any, init: { status?: number; headers?: Record<string, string> } = {}) {
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
  async arrayBuffer(): Promise<ArrayBuffer> {
    if (typeof this._body === "string") {
      const enc = new TextEncoder();
      return enc.encode(this._body).buffer;
    }
    if (this._body instanceof Uint8Array) {
      const buf = this._body;
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
    if (this._body instanceof ArrayBuffer) {
      return this._body;
    }
    return new ArrayBuffer(0);
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
(globalThis as any).Response = ResponseMock as any;

import { GET as GET_AGENT_BASE } from "@/app/images/agent-base.png/route";
import { GET as GET_AGENT_INTEGRATION } from "@/app/images/agent-integration.png/route";
import { GET as GET_AGENT_DASHBOARD } from "@/app/images/agent-dashboard.png/route";
import { GET as GET_CONSULTING_SMALL } from "@/app/images/consulting-small.png/route";
import { GET as GET_CONSULTING_MEDIUM } from "@/app/images/consulting-medium.png/route";
import { GET as GET_CONSULTING_LARGE } from "@/app/images/consulting-large.png/route";

async function readBuffer(res: Response) {
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

function expectPngSignature(bytes: Uint8Array) {
  // Firma PNG: 89 50 4E 47 0D 0A 1A 0A
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  expect(bytes.length).toBeGreaterThanOrEqual(8);
  for (let i = 0; i < signature.length; i++) {
    expect(bytes[i]).toBe(signature[i]);
  }
}

describe("Placeholders de imágenes (.png) devuelven 200 y PNG válido", () => {
  it("/images/agent-base.png", async () => {
    const res = await GET_AGENT_BASE();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/image\/png/i);
    const body = await readBuffer(res);
    expectPngSignature(body);
  });

  it("/images/agent-integration.png", async () => {
    const res = await GET_AGENT_INTEGRATION();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/image\/png/i);
    const body = await readBuffer(res);
    expectPngSignature(body);
  });

  it("/images/agent-dashboard.png", async () => {
    const res = await GET_AGENT_DASHBOARD();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/image\/png/i);
    const body = await readBuffer(res);
    expectPngSignature(body);
  });

  it("/images/consulting-small.png", async () => {
    const res = await GET_CONSULTING_SMALL();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/image\/png/i);
    const body = await readBuffer(res);
    expectPngSignature(body);
  });

  it("/images/consulting-medium.png", async () => {
    const res = await GET_CONSULTING_MEDIUM();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/image\/png/i);
    const body = await readBuffer(res);
    expectPngSignature(body);
  });

  it("/images/consulting-large.png", async () => {
    const res = await GET_CONSULTING_LARGE();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/image\/png/i);
    const body = await readBuffer(res);
    expectPngSignature(body);
  });
});
