import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não configurada");
}

const sql = neon(process.env.DATABASE_URL);

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      unidade TEXT NOT NULL,
      categoria TEXT NOT NULL DEFAULT 'Geral',
      quantidade REAL NOT NULL DEFAULT 0,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS movimentacoes (
      id SERIAL PRIMARY KEY,
      produto_id INTEGER NOT NULL REFERENCES produtos(id),
      tipo TEXT NOT NULL,
      quantidade REAL NOT NULL,
      observacao TEXT NOT NULL DEFAULT '',
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
}

export default sql;
