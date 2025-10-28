import { NextResponse } from "next/server"
import crypto from "crypto"

function base64url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
    const SECRET = process.env.ADMIN_SESSION_SECRET

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !SECRET) {
      return NextResponse.json(
        { ok: false, error: "Faltan variables de entorno: ADMIN_EMAIL, ADMIN_PASSWORD y/o ADMIN_SESSION_SECRET" },
        { status: 500 },
      )
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ ok: false, error: "Credenciales inválidas" }, { status: 401 })
    }

    const header = { alg: "HS256", typ: "JWT" }
    const now = Math.floor(Date.now() / 1000)
    const exp = now + 7 * 24 * 60 * 60 // 7 días
    const payload = { sub: ADMIN_EMAIL, iat: now, exp }

    const headerB64 = base64url(Buffer.from(JSON.stringify(header)))
    const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)))
    const data = `${headerB64}.${payloadB64}`

    const signature = crypto.createHmac("sha256", SECRET).update(data).digest()
    const token = `${data}.${base64url(signature)}`

    const res = NextResponse.json({ ok: true })

    // 7 días
    const maxAge = 7 * 24 * 60 * 60

    res.cookies.set("admin_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    })

    return res
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Error procesando la solicitud" }, { status: 400 })
  }
}