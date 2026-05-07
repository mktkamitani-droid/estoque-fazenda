import sql, { initDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const { latitude, longitude } = await req.json();

    if (session.role !== "admin") {
      const [f] = await sql`SELECT owner FROM fazendas WHERE id = ${id}`;
      if (f?.owner !== session.usuario) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    await sql`UPDATE fazendas SET latitude = ${latitude}, longitude = ${longitude} WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
