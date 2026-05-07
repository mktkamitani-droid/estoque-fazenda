import sql, { initDb } from "@/lib/db";
import { getSession, resolveFazendas } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const filter = resolveFazendas(session, req.nextUrl.searchParams.get("fazenda"));
    const rows = filter === null
      ? await sql`SELECT * FROM chuvas ORDER BY data DESC, criado_em DESC`
      : filter.length === 0 ? []
      : await sql`SELECT * FROM chuvas WHERE fazenda = ANY(${filter}) ORDER BY data DESC, criado_em DESC`;
    return NextResponse.json(rows);
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

    const { fazenda, mm, data, observacao } = await req.json();
    if (!fazenda || !mm || !data) return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    if (session.fazendas !== null && !session.fazendas.includes(fazenda)) {
      return NextResponse.json({ error: "Sem acesso a esta fazenda" }, { status: 403 });
    }

    const [row] = await sql`
      INSERT INTO chuvas (fazenda, mm, data, observacao)
      VALUES (${fazenda}, ${Number(mm)}, ${data}, ${observacao || ""})
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
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
    await sql`DELETE FROM chuvas WHERE id = ${Number(id)}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
