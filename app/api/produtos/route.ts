import sql, { initDb } from "@/lib/db";
import { getSession, resolveFazendas } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const filter = resolveFazendas(session, req.nextUrl.searchParams.get("fazenda"));
    const produtos = filter === null
      ? await sql`SELECT * FROM produtos ORDER BY nome ASC`
      : filter.length === 0 ? []
      : await sql`SELECT * FROM produtos WHERE fazenda = ANY(${filter}) ORDER BY nome ASC`;
    return NextResponse.json(produtos);
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

    const { nome, unidade, categoria, fazenda, recomendacao } = await req.json();
    if (!nome || !unidade) return NextResponse.json({ error: "Nome e unidade são obrigatórios" }, { status: 400 });
    if (session.fazendas !== null && !session.fazendas.includes(fazenda)) {
      return NextResponse.json({ error: "Sem acesso a esta fazenda" }, { status: 403 });
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
