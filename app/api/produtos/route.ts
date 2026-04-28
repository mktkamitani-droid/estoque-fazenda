import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    await initDb();
    const produtos = await sql`SELECT * FROM produtos ORDER BY nome ASC`;
    return NextResponse.json(produtos);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { nome, unidade, categoria } = await req.json();
    if (!nome || !unidade) {
      return NextResponse.json({ error: "Nome e unidade são obrigatórios" }, { status: 400 });
    }
    const [produto] = await sql`
      INSERT INTO produtos (nome, unidade, categoria)
      VALUES (${nome}, ${unidade}, ${categoria || "Geral"})
      RETURNING *
    `;
    return NextResponse.json(produto, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
