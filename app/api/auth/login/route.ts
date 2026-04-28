import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { usuario, senha } = await req.json();

  if (
    usuario === process.env.AUTH_USER &&
    senha === process.env.AUTH_PASSWORD
  ) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("auth_token", process.env.AUTH_SECRET!, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  }

  return NextResponse.json({ error: "Usuário ou senha incorretos" }, { status: 401 });
}
