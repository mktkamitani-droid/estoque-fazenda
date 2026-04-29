import sql, { initDb } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await initDb();
    const [categorias, ultimasMovs, colheitas] = await Promise.all([
      sql`
        SELECT fazenda, categoria,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE quantidade <= 0)::int AS sem_estoque
        FROM produtos
        GROUP BY fazenda, categoria
        ORDER BY fazenda, categoria
      `,
      sql`
        SELECT DISTINCT ON (p.fazenda)
          p.fazenda, m.criado_em, m.tipo, m.quantidade::float AS quantidade,
          p.nome AS produto, p.unidade
        FROM movimentacoes m
        JOIN produtos p ON m.produto_id = p.id
        ORDER BY p.fazenda, m.criado_em DESC
      `,
      sql`
        SELECT fazenda, produto, SUM(quantidade)::float AS total, unidade
        FROM colheitas
        WHERE data >= date_trunc('month', CURRENT_DATE)
        GROUP BY fazenda, produto, unidade
        ORDER BY fazenda, total DESC
      `,
    ]);

    const fazMap: Record<string, {
      total: number; sem_estoque: number;
      por_categoria: { categoria: string; count: number; sem_estoque: number }[];
      ultima_mov: { criado_em: string; tipo: string; quantidade: number; produto: string; unidade: string } | null;
    }> = {};

    for (const row of categorias) {
      if (!fazMap[row.fazenda]) fazMap[row.fazenda] = { total: 0, sem_estoque: 0, por_categoria: [], ultima_mov: null };
      fazMap[row.fazenda].total       += row.total;
      fazMap[row.fazenda].sem_estoque += row.sem_estoque;
      fazMap[row.fazenda].por_categoria.push({ categoria: row.categoria, count: row.total, sem_estoque: row.sem_estoque });
    }

    for (const m of ultimasMovs) {
      if (fazMap[m.fazenda]) {
        fazMap[m.fazenda].ultima_mov = {
          criado_em: m.criado_em,
          tipo: m.tipo,
          quantidade: m.quantidade,
          produto: m.produto,
          unidade: m.unidade,
        };
      }
    }

    const colhMap: Record<string, { produto: string; total: number; unidade: string }[]> = {};
    for (const c of colheitas) {
      if (!colhMap[c.fazenda]) colhMap[c.fazenda] = [];
      colhMap[c.fazenda].push({ produto: c.produto, total: Number(c.total), unidade: c.unidade });
    }

    const result = Object.entries(fazMap).map(([nome, data]) => ({
      nome, ...data, colheitas_mes: colhMap[nome] ?? [],
    }));

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
