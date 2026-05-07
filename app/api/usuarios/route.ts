import sql, { initDb } from "@/lib/db";
import { hashSenha } from "@/lib/hash";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  await initDb();
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  try {
    const usuarios = await sql`SELECT id, usuario, role, criado_em FROM usuarios ORDER BY criado_em DESC`;
    const fazRows = await sql`SELECT usuario, fazenda FROM usuario_fazendas`;
    const fazMap: Record<string, string[]> = {};
    for (const r of fazRows as any[]) {
      if (!fazMap[r.usuario]) fazMap[r.usuario] = [];
      fazMap[r.usuario].push(r.fazenda);
    }
    return NextResponse.json((usuarios as any[]).map(u => ({ ...u, fazendas: fazMap[u.usuario] ?? [] })));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { usuario, senha } = await req.json();
    if (!usuario?.trim() || !senha?.trim()) return NextResponse.json({ error: "Usuário e senha obrigatórios" }, { status: 400 });
    if (senha.length < 6) return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres" }, { status: 400 });

    const senha_hash = hashSenha(senha);
    const [novo] = await sql`
      INSERT INTO usuarios (usuario, senha_hash)
      VALUES (${usuario.trim().toLowerCase()}, ${senha_hash})
      ON CONFLICT (usuario) DO NOTHING
      RETURNING id, usuario, role, criado_em
    `;
    if (!novo) return NextResponse.json({ error: "Usuário já existe" }, { status: 409 });
    return NextResponse.json(novo, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await initDb();
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  try {
    const { id } = await req.json();
    await sql`DELETE FROM usuarios WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
