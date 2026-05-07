import sql, { initDb } from "@/lib/db";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

async function isAdmin() {
  const token = (await cookies()).get("auth_token")?.value;
  return token === process.env.AUTH_SECRET;
}

function toCSV(rows: Record<string, any>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(";"),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(";")),
  ];
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  try {
    await initDb();
    if (!(await isAdmin())) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const tipo = req.nextUrl.searchParams.get("tipo") ?? "estoque";

    let rows: Record<string, any>[] = [];
    let filename = "export.csv";

    if (tipo === "estoque") {
      rows = await sql`SELECT p.fazenda, p.nome, p.categoria, p.quantidade, p.unidade, p.recomendacao, p.criado_em FROM produtos p ORDER BY p.fazenda, p.categoria, p.nome`;
      filename = "estoque.csv";
    } else if (tipo === "colheitas") {
      rows = await sql`SELECT fazenda, produto, quantidade, unidade, destino, placa, observacao, data, criado_em FROM colheitas ORDER BY data DESC`;
      filename = "colheitas.csv";
    } else if (tipo === "chuvas") {
      rows = await sql`SELECT fazenda, mm, data, observacao, criado_em FROM chuvas ORDER BY data DESC`;
      filename = "chuvas.csv";
    } else if (tipo === "movimentacoes") {
      rows = await sql`SELECT p.fazenda, p.nome AS produto, m.tipo, m.quantidade, p.unidade, m.responsavel, m.observacao, m.criado_em FROM movimentacoes m JOIN produtos p ON m.produto_id = p.id ORDER BY m.criado_em DESC`;
      filename = "movimentacoes.csv";
    }

    const csv = toCSV(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
