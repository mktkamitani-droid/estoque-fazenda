import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  const secret = process.env.AUTH_SECRET;

  const isLoginPage = req.nextUrl.pathname === "/login";
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");

  if (isLoginPage || isApiAuth) return NextResponse.next();

  if (!token || token !== secret) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
