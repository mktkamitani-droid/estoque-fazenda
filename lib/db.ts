import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;

function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL não configurada");
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

export async function initDb() {
  const sql = getSql();
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
  await sql`ALTER TABLE produtos ADD COLUMN IF NOT EXISTS fazenda TEXT NOT NULL DEFAULT 'Tinguara'`;
  await sql`UPDATE produtos SET fazenda = 'Dom' WHERE fazenda = 'Tinguara' AND criado_em < '2026-04-30'`;
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
  await sql`ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS responsavel TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE produtos ADD COLUMN IF NOT EXISTS recomendacao TEXT NOT NULL DEFAULT ''`;
  await sql`
    CREATE TABLE IF NOT EXISTS colheitas (
      id SERIAL PRIMARY KEY,
      fazenda TEXT NOT NULL,
      produto TEXT NOT NULL,
      quantidade REAL NOT NULL,
      unidade TEXT NOT NULL DEFAULT 'sc',
      destino TEXT NOT NULL DEFAULT '',
      placa TEXT NOT NULL DEFAULT '',
      observacao TEXT NOT NULL DEFAULT '',
      data DATE NOT NULL DEFAULT CURRENT_DATE,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS fazendas (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL UNIQUE,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    INSERT INTO fazendas (nome) VALUES ('Dom'), ('Tinguara'), ('Santa Rosa'), ('Santa Rita')
    ON CONFLICT (nome) DO NOTHING
  `;
  await sql`DELETE FROM fazendas WHERE nome = 'Copasul'
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      usuario TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
}

export default function sql(
  strings: TemplateStringsArray,
  ...values: any[]
) {
  return getSql()(strings, ...values);
}
