import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const fazenda = req.nextUrl.searchParams.get("fazenda");
    const produtos = fazenda
      ? await sql`SELECT * FROM produtos WHERE fazenda = ${fazenda} ORDER BY nome ASC`
      : await sql`SELECT * FROM produtos ORDER BY nome ASC`;
    return NextResponse.json(produtos);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { nome, unidade, categoria, fazenda, recomendacao } = await req.json();
    if (!nome || !unidade) {
      return NextResponse.json({ error: "Nome e unidade são obrigatórios" }, { status: 400 });
    }
    const [produto] = await sql`
      INSERT INTO produtos (nome, unidade, categoria, fazenda, recomendacao)
      VALUES (${nome}, ${unidade}, ${categoria || "Geral"}, ${fazenda || "Tinguara"}, ${recomendacao || ""})
      RETURNING *
    `;
    return NextResponse.json(produto, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
