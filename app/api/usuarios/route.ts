import sql, { initDb } from "@/lib/db";
import { hashSenha } from "@/lib/hash";
import { NextRequest, NextResponse } from "next/server";

function isAdmin(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  return token === process.env.AUTH_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  try {
    await initDb();
    const usuarios = await sql`
      SELECT id, usuario, role, criado_em FROM usuarios ORDER BY criado_em DESC
    `;
    return NextResponse.json(usuarios);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { usuario, senha } = await req.json();
    if (!usuario?.trim() || !senha?.trim()) {
      return NextResponse.json({ error: "Usuário e senha obrigatórios" }, { status: 400 });
    }
    if (senha.length < 6) {
      return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres" }, { status: 400 });
    }
    const senha_hash = hashSenha(senha);
    const [novo] = await sql`
      INSERT INTO usuarios (usuario, senha_hash)
      VALUES (${usuario.trim().toLowerCase()}, ${senha_hash})
      ON CONFLICT (usuario) DO NOTHING
      RETURNING id, usuario, role, criado_em
    `;
    if (!novo) {
      return NextResponse.json({ error: "Usuário já existe" }, { status: 409 });
    }
    return NextResponse.json(novo, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  try {
    const { id } = await req.json();
    await sql`DELETE FROM usuarios WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
