import sql, { initDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const fazenda = req.nextUrl.searchParams.get("fazenda");
    const rows = fazenda
      ? await sql`SELECT * FROM chuvas WHERE fazenda = ${fazenda} ORDER BY data DESC, criado_em DESC`
      : await sql`SELECT * FROM chuvas ORDER BY data DESC, criado_em DESC`;
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { fazenda, mm, data, observacao } = await req.json();
    if (!fazenda || !mm || !data) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
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
    const { id } = await req.json();
    await sql`DELETE FROM chuvas WHERE id = ${Number(id)}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
