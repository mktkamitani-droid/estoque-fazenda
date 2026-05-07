import sql, { initDb } from "@/lib/db";
import { getSession, resolveFazendas } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const filter = resolveFazendas(session, req.nextUrl.searchParams.get("fazenda"));
    const colheitas = filter === null
      ? await sql`SELECT * FROM colheitas ORDER BY data DESC, criado_em DESC`
      : filter.length === 0 ? []
      : await sql`SELECT * FROM colheitas WHERE fazenda = ANY(${filter}) ORDER BY data DESC, criado_em DESC`;
    return NextResponse.json(colheitas);
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

    const { fazenda, produto, quantidade, unidade, destino, placa, observacao, data } = await req.json();
    if (!fazenda || !produto || !quantidade) return NextResponse.json({ error: "Fazenda, produto e quantidade são obrigatórios" }, { status: 400 });
    if (session.fazendas !== null && !session.fazendas.includes(fazenda)) {
      return NextResponse.json({ error: "Sem acesso a esta fazenda" }, { status: 403 });
    }

    const [carga] = await sql`
      INSERT INTO colheitas (fazenda, produto, quantidade, unidade, destino, placa, observacao, data)
      VALUES (${fazenda}, ${produto}, ${Number(quantidade)}, ${unidade || "sc"}, ${destino || ""}, ${placa || ""}, ${observacao || ""}, ${data || new Date().toISOString().slice(0, 10)})
      RETURNING *
    `;
    return NextResponse.json(carga, { status: 201 });
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

    const { id } = await req.json();
    await sql`DELETE FROM colheitas WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
