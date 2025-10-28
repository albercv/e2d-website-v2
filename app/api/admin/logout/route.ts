import { NextResponse } from "next/server"

export async function POST(req: Request) {
  // Redirige a la home tras cerrar sesión
  const url = new URL("/", req.url)
  const res = NextResponse.redirect(url, 303)
  res.cookies.set("admin_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  })
  return res
}