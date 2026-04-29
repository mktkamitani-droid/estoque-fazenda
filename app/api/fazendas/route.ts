import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    await initDb();
    const fazendas = await sql`
      SELECT f.id, f.nome,
        COUNT(p.id)::int AS total_produtos,
        COUNT(CASE WHEN p.quantidade <= 0 THEN 1 END)::int AS sem_estoque
      FROM fazendas f
      LEFT JOIN produtos p ON p.fazenda = f.nome
      GROUP BY f.id, f.nome
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
    const { nome } = await req.json();
    if (!nome?.trim()) {
      return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    }
    const [fazenda] = await sql`
      INSERT INTO fazendas (nome) VALUES (${nome.trim()})
      ON CONFLICT (nome) DO NOTHING
      RETURNING *
    `;
    return NextResponse.json(fazenda ?? { error: "Fazenda já existe" }, { status: fazenda ? 201 : 409 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { nome } = await req.json();
    await sql`DELETE FROM fazendas WHERE nome = ${nome}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
