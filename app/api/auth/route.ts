// app/api/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { serialize } from "cookie";
import jwt from "jsonwebtoken";

const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const PASSWORD = process.env.LOGIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = "7d"; // Token-Gültigkeit: 7 Tage

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  // Prüfe, ob beide Werte korrekt sind
  if (email !== LOGIN_EMAIL || password !== PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Erstelle das JWT und füge die E-Mail als Zusatzinformation ein
  const token = jwt.sign({ authenticated: true, email }, JWT_SECRET!, { expiresIn: TOKEN_EXPIRY });

  // Setze das Token als Cookie
  const response = NextResponse.json({ success: true });
  response.cookies.set("auth", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
