import sql from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const fazenda = req.nextUrl.searchParams.get("fazenda");
    const movs = fazenda
      ? await sql`
          SELECT m.*, p.nome as produto_nome, p.unidade as produto_unidade
          FROM movimentacoes m
          JOIN produtos p ON p.id = m.produto_id
          WHERE p.fazenda = ${fazenda}
          ORDER BY m.criado_em DESC
          LIMIT 100
        `
      : await sql`
          SELECT m.*, p.nome as produto_nome, p.unidade as produto_unidade
          FROM movimentacoes m
          JOIN produtos p ON p.id = m.produto_id
          ORDER BY m.criado_em DESC
          LIMIT 100
        `;
    const resultado = movs.map((m: any) => ({
      id: m.id,
      tipo: m.tipo,
      quantidade: m.quantidade,
      observacao: m.observacao,
      responsavel: m.responsavel,
      criadoEm: m.criado_em,
      produto: { nome: m.produto_nome, unidade: m.produto_unidade },
    }));
    return NextResponse.json(resultado);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { produtoId, tipo, quantidade, observacao, responsavel } = await req.json();
    if (!produtoId || !tipo || !quantidade) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }
    const delta = tipo === "ENTRADA" ? Number(quantidade) : -Number(quantidade);

    await sql`
      INSERT INTO movimentacoes (produto_id, tipo, quantidade, observacao, responsavel)
      VALUES (${Number(produtoId)}, ${tipo}, ${Number(quantidade)}, ${observacao || ""}, ${responsavel || ""})
    `;
    await sql`
      UPDATE produtos SET quantidade = quantidade + ${delta} WHERE id = ${Number(produtoId)}
    `;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
