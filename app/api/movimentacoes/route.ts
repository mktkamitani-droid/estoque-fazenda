import sql, { registrarLog } from "@/lib/db";
import { getSession, resolveFazendas } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const filter = resolveFazendas(session, req.nextUrl.searchParams.get("fazenda"));
    const movs = filter === null
      ? await sql`
          SELECT m.*, p.nome as produto_nome, p.unidade as produto_unidade
          FROM movimentacoes m JOIN produtos p ON p.id = m.produto_id
          ORDER BY m.criado_em DESC LIMIT 100
        `
      : filter.length === 0 ? []
      : await sql`
          SELECT m.*, p.nome as produto_nome, p.unidade as produto_unidade
          FROM movimentacoes m JOIN produtos p ON p.id = m.produto_id
          WHERE p.fazenda = ANY(${filter})
          ORDER BY m.criado_em DESC LIMIT 100
        `;
    return NextResponse.json((movs as any[]).map((m) => ({
      id: m.id, tipo: m.tipo, quantidade: m.quantidade,
      observacao: m.observacao, responsavel: m.responsavel, criadoEm: m.criado_em,
      produto: { nome: m.produto_nome, unidade: m.produto_unidade },
    })));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (session.role === "demo") return NextResponse.json({ error: "Acesso somente leitura" }, { status: 403 });

    const { produtoId, tipo, quantidade, observacao, responsavel } = await req.json();
    if (!produtoId || !tipo || !quantidade) return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });

    const [prod] = await sql`SELECT nome, fazenda FROM produtos WHERE id = ${Number(produtoId)}`;
    if (session.fazendas !== null && !session.fazendas.includes(prod?.fazenda)) {
      return NextResponse.json({ error: "Sem acesso a esta fazenda" }, { status: 403 });
    }

    const delta = tipo === "ENTRADA" ? Number(quantidade) : -Number(quantidade);
    await sql`
      INSERT INTO movimentacoes (produto_id, tipo, quantidade, observacao, responsavel)
      VALUES (${Number(produtoId)}, ${tipo}, ${Number(quantidade)}, ${observacao || ""}, ${responsavel || ""})
    `;
    await sql`UPDATE produtos SET quantidade = quantidade + ${delta} WHERE id = ${Number(produtoId)}`;
    await registrarLog(responsavel || "—", tipo === "ENTRADA" ? "Entrada" : "Saída", `${quantidade} ${prod?.nome ?? ""}`, prod?.fazenda ?? "");

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
