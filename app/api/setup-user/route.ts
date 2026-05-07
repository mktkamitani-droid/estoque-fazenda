import sql, { initDb } from "@/lib/db";
import { hashSenha } from "@/lib/hash";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  await initDb();
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { usuario, senha, role, fazendas } = await req.json();
  const user = usuario.trim().toLowerCase();

  const existing = await sql`SELECT id FROM usuarios WHERE usuario = ${user}`;
  if (existing.length > 0) {
    if (senha) {
      const hash = hashSenha(senha);
      await sql`UPDATE usuarios SET senha_hash = ${hash}, role = ${role ?? "user"} WHERE usuario = ${user}`;
    } else {
      await sql`UPDATE usuarios SET role = ${role ?? "user"} WHERE usuario = ${user}`;
    }
  } else {
    const hash = hashSenha(senha);
    await sql`INSERT INTO usuarios (usuario, senha_hash, role) VALUES (${user}, ${hash}, ${role ?? "user"})`;
  }

  if (Array.isArray(fazendas)) {
    await sql`DELETE FROM usuario_fazendas WHERE usuario = ${user}`;
    for (const f of fazendas) {
      await sql`INSERT INTO usuario_fazendas (usuario, fazenda) VALUES (${user}, ${f}) ON CONFLICT DO NOTHING`;
    }
  }

  return NextResponse.json({ ok: true, usuario: user, role: role ?? "user" });
}
