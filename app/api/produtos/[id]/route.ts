import sql from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { nome, unidade, categoria, fazenda, recomendacao } = await req.json();
    if (!nome || !unidade) {
      return NextResponse.json({ error: "Nome e unidade são obrigatórios" }, { status: 400 });
    }
    const [produto] = await sql`
      UPDATE produtos
      SET nome = ${nome}, unidade = ${unidade}, categoria = ${categoria || "Geral"},
          fazenda = ${fazenda}, recomendacao = ${recomendacao || ""}
      WHERE id = ${Number(id)}
      RETURNING *
    `;
    return NextResponse.json(produto);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await sql`DELETE FROM movimentacoes WHERE produto_id = ${Number(id)}`;
    await sql`DELETE FROM produtos WHERE id = ${Number(id)}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
