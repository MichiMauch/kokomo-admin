// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;

export async function middleware(req: NextRequest) {
  // Erlaube den Zugriff auf bestimmte Pfade
  if (
    req.nextUrl.pathname === "/login" ||
    req.nextUrl.pathname.startsWith("/api") ||
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Hole das Token aus dem Cookie
  const token = req.cookies.get("auth")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // Erzeuge einen Uint8Array-Secret aus dem JWT_SECRET
    const secret = new TextEncoder().encode(JWT_SECRET);
    // Verifiziere das Token
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: "/((?!api|login|_next|favicon.ico).*)",
};
