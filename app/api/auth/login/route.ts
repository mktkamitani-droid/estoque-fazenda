import sql, { initDb } from "@/lib/db";
import { verificarSenha } from "@/lib/hash";
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function gerarTokenUsuario(id: number) {
  const hmac = createHmac("sha256", process.env.AUTH_SECRET!).update(String(id)).digest("hex");
  return `user:${hmac}:${id}`;
}

export async function POST(req: NextRequest) {
  const { usuario, senha } = await req.json();

  // Admin via env var
  if (
    usuario === process.env.AUTH_USER &&
    senha === process.env.AUTH_PASSWORD
  ) {
    const res = NextResponse.json({ ok: true, role: "admin" });
    res.cookies.set("auth_token", process.env.AUTH_SECRET!, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  }

  // Usuários do banco
  try {
    await initDb();
  } catch (e) {
    console.error("[login] initDb error:", e);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }

  try {
    const [user] = await sql`
      SELECT id, usuario, senha_hash, role FROM usuarios WHERE usuario = ${usuario?.trim().toLowerCase()}
    `;
    if (user && verificarSenha(senha, user.senha_hash)) {
      const token = gerarTokenUsuario(user.id);
      const res = NextResponse.json({ ok: true, role: user.role });
      res.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
      return res;
    }
  } catch (e) {
    console.error("[login] query error:", e);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }

  return NextResponse.json({ error: "Usuário ou senha incorretos" }, { status: 401 });
}
