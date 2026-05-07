import sql, { initDb } from "@/lib/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function isAdmin() {
  const token = (await cookies()).get("auth_token")?.value;
  return token === process.env.AUTH_SECRET;
}

export async function GET() {
  try {
    await initDb();
    if (!(await isAdmin())) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const rows = await sql`SELECT * FROM logs ORDER BY criado_em DESC LIMIT 500`;
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
