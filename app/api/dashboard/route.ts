import sql, { initDb } from "@/lib/db";
import { getSession, resolveFazendas } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const filter = resolveFazendas(session);

    const [categorias, ultimasMovs, colheitas, chuvaRows] = await Promise.all([
      filter === null
        ? sql`SELECT fazenda, categoria, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE quantidade <= 0)::int AS sem_estoque FROM produtos GROUP BY fazenda, categoria ORDER BY fazenda, categoria`
        : filter.length === 0 ? Promise.resolve([])
        : sql`SELECT fazenda, categoria, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE quantidade <= 0)::int AS sem_estoque FROM produtos WHERE fazenda = ANY(${filter}) GROUP BY fazenda, categoria ORDER BY fazenda, categoria`,

      filter === null
        ? sql`SELECT DISTINCT ON (p.fazenda) p.fazenda, m.criado_em, m.tipo, m.quantidade::float AS quantidade, p.nome AS produto, p.unidade FROM movimentacoes m JOIN produtos p ON m.produto_id = p.id ORDER BY p.fazenda, m.criado_em DESC`
        : filter.length === 0 ? Promise.resolve([])
        : sql`SELECT DISTINCT ON (p.fazenda) p.fazenda, m.criado_em, m.tipo, m.quantidade::float AS quantidade, p.nome AS produto, p.unidade FROM movimentacoes m JOIN produtos p ON m.produto_id = p.id WHERE p.fazenda = ANY(${filter}) ORDER BY p.fazenda, m.criado_em DESC`,

      filter === null
        ? sql`SELECT fazenda, produto, SUM(quantidade)::float AS total, unidade FROM colheitas WHERE data >= date_trunc('month', CURRENT_DATE) GROUP BY fazenda, produto, unidade ORDER BY fazenda, total DESC`
        : filter.length === 0 ? Promise.resolve([])
        : sql`SELECT fazenda, produto, SUM(quantidade)::float AS total, unidade FROM colheitas WHERE data >= date_trunc('month', CURRENT_DATE) AND fazenda = ANY(${filter}) GROUP BY fazenda, produto, unidade ORDER BY fazenda, total DESC`,

      filter === null
        ? sql`SELECT fazenda, COALESCE(SUM(mm) FILTER (WHERE data >= CURRENT_DATE - INTERVAL '7 days'), 0)::float AS chuva_semana, COALESCE(SUM(mm) FILTER (WHERE EXTRACT(YEAR FROM data) = EXTRACT(YEAR FROM CURRENT_DATE)), 0)::float AS chuva_ano FROM chuvas GROUP BY fazenda`
        : filter.length === 0 ? Promise.resolve([])
        : sql`SELECT fazenda, COALESCE(SUM(mm) FILTER (WHERE data >= CURRENT_DATE - INTERVAL '7 days'), 0)::float AS chuva_semana, COALESCE(SUM(mm) FILTER (WHERE EXTRACT(YEAR FROM data) = EXTRACT(YEAR FROM CURRENT_DATE)), 0)::float AS chuva_ano FROM chuvas WHERE fazenda = ANY(${filter}) GROUP BY fazenda`,
    ]);

    const fazMap: Record<string, any> = {};
    for (const row of categorias as any[]) {
      if (!fazMap[row.fazenda]) fazMap[row.fazenda] = { total: 0, sem_estoque: 0, por_categoria: [], ultima_mov: null };
      fazMap[row.fazenda].total += row.total;
      fazMap[row.fazenda].sem_estoque += row.sem_estoque;
      fazMap[row.fazenda].por_categoria.push({ categoria: row.categoria, count: row.total, sem_estoque: row.sem_estoque });
    }
    for (const m of ultimasMovs as any[]) {
      if (fazMap[m.fazenda]) {
        fazMap[m.fazenda].ultima_mov = { criado_em: m.criado_em, tipo: m.tipo, quantidade: m.quantidade, produto: m.produto, unidade: m.unidade };
      }
    }

    const colhMap: Record<string, any[]> = {};
    for (const c of colheitas as any[]) {
      if (!colhMap[c.fazenda]) colhMap[c.fazenda] = [];
      colhMap[c.fazenda].push({ produto: c.produto, total: Number(c.total), unidade: c.unidade });
    }
    const chuvaMap: Record<string, any> = {};
    for (const c of chuvaRows as any[]) {
      chuvaMap[c.fazenda] = { chuva_semana: Number(c.chuva_semana), chuva_ano: Number(c.chuva_ano) };
    }

    const result = Object.entries(fazMap).map(([nome, data]) => ({
      nome, ...data,
      colheitas_mes: colhMap[nome] ?? [],
      chuva_semana: chuvaMap[nome]?.chuva_semana ?? 0,
      chuva_ano: chuvaMap[nome]?.chuva_ano ?? 0,
    }));

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
