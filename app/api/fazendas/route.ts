import sql, { initDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    await initDb();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const fazendas = session.role === "admin"
      ? await sql`
          SELECT f.id, f.nome, f.owner, f.latitude, f.longitude,
            COUNT(p.id)::int AS total_produtos,
            COUNT(CASE WHEN p.quantidade <= 0 THEN 1 END)::int AS sem_estoque
          FROM fazendas f
          LEFT JOIN produtos p ON p.fazenda = f.nome
          GROUP BY f.id, f.nome, f.owner, f.latitude, f.longitude
          ORDER BY f.owner, f.nome ASC
        `
      : await sql`
          SELECT f.id, f.nome, f.owner, f.latitude, f.longitude,
            COUNT(p.id)::int AS total_produtos,
            COUNT(CASE WHEN p.quantidade <= 0 THEN 1 END)::int AS sem_estoque
          FROM fazendas f
          LEFT JOIN produtos p ON p.fazenda = f.nome
          WHERE f.owner = ${session.usuario}
          GROUP BY f.id, f.nome, f.owner, f.latitude, f.longitude
          ORDER BY f.nome ASC
        `;

    return NextResponse.json(fazendas);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (session.role === "demo") return NextResponse.json({ error: "Acesso somente leitura" }, { status: 403 });

    const { nome } = await req.json();
    if (!nome?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    const owner = session.role === "admin" ? "admin" : session.usuario;
    const [fazenda] = await sql`
      INSERT INTO fazendas (nome, owner) VALUES (${nome.trim()}, ${owner})
      ON CONFLICT (nome) DO NOTHING
      RETURNING *
    `;
    return NextResponse.json(fazenda ?? { error: "Nome já existe" }, { status: fazenda ? 201 : 409 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDb();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (session.role === "demo") return NextResponse.json({ error: "Acesso somente leitura" }, { status: 403 });

    const { nome } = await req.json();
    if (session.role !== "admin") {
      const [f] = await sql`SELECT owner FROM fazendas WHERE nome = ${nome}`;
      if (f?.owner !== session.usuario) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    await sql`DELETE FROM fazendas WHERE nome = ${nome}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
