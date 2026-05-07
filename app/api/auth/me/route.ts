import { initDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  await initDb();
  const session = await getSession();
  if (!session) return NextResponse.json({ role: null });
  return NextResponse.json({
    usuario: session.usuario,
    role: session.role,
    fazendas: session.fazendas,
  });
}
