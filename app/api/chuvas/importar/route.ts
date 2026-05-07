import sql, { initDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { ano } = body as { ano?: number };

    const fazendas = session.fazendas === null
      ? await sql`SELECT id, nome, latitude, longitude FROM fazendas WHERE latitude IS NOT NULL AND longitude IS NOT NULL`
      : await sql`SELECT id, nome, latitude, longitude FROM fazendas WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND nome = ANY(${session.fazendas})`;

    if (fazendas.length === 0) return NextResponse.json({ importados: 0, aviso: "Nenhuma fazenda com coordenadas configuradas." });

    const hoje = new Date();
    const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
    const ontemStr = ontem.toISOString().slice(0, 10);

    let startDate: string;
    let endDate: string;
    let useArchive: boolean;

    if (ano) {
      startDate = `${ano}-01-01`;
      const anoFimStr = `${ano}-12-31`;
      endDate = anoFimStr > ontemStr ? ontemStr : anoFimStr;
      useArchive = true;
    } else {
      startDate = "";
      endDate = "";
      useArchive = false;
    }

    let importados = 0;
    const erros: string[] = [];

    for (const faz of fazendas) {
      try {
        let url: string;
        if (useArchive) {
          url = `https://archive-api.open-meteo.com/v1/archive?latitude=${faz.latitude}&longitude=${faz.longitude}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum&timezone=America%2FSao_Paulo`;
        } else {
          url = `https://api.open-meteo.com/v1/forecast?latitude=${faz.latitude}&longitude=${faz.longitude}&daily=precipitation_sum&timezone=America%2FSao_Paulo&past_days=7&forecast_days=1`;
        }

        const res = await fetch(url);
        if (!res.ok) { erros.push(faz.nome); continue; }
        const data = await res.json();
        const dias: string[] = data.daily.time;
        const mm: number[] = data.daily.precipitation_sum;

        for (let i = 0; i < dias.length; i++) {
          const precipitacao = mm[i];
          if (!precipitacao || precipitacao <= 0) continue;
          const [existente] = await sql`SELECT id FROM chuvas WHERE fazenda = ${faz.nome} AND data = ${dias[i]}`;
          if (existente) continue;
          await sql`INSERT INTO chuvas (fazenda, mm, data, observacao) VALUES (${faz.nome}, ${precipitacao}, ${dias[i]}, 'Open-Meteo')`;
          importados++;
        }
      } catch {
        erros.push(faz.nome);
      }
    }

    return NextResponse.json({ importados, erros: erros.length > 0 ? erros : undefined });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
