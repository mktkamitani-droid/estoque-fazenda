import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { createHash, randomBytes } from "crypto";

function hashLocal(senha: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${createHash("sha256").update(salt + senha).digest("hex")}`;
}

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
  await sql`ALTER TABLE fazendas ADD COLUMN IF NOT EXISTS latitude REAL`;
  await sql`ALTER TABLE fazendas ADD COLUMN IF NOT EXISTS longitude REAL`;
  await sql`ALTER TABLE fazendas ADD COLUMN IF NOT EXISTS owner TEXT NOT NULL DEFAULT 'admin'`;
  await sql`
    INSERT INTO fazendas (nome) VALUES ('Dom'), ('Tinguara'), ('Santa Rosa'), ('Santa Rita')
    ON CONFLICT (nome) DO NOTHING
  `;
  await sql`DELETE FROM fazendas WHERE nome = 'Copasul'`;
  await sql`DELETE FROM produtos WHERE fazenda = 'Copasul'`;
  await sql`
    CREATE TABLE IF NOT EXISTS chuvas (
      id SERIAL PRIMARY KEY,
      fazenda TEXT NOT NULL,
      mm REAL NOT NULL,
      data DATE NOT NULL DEFAULT CURRENT_DATE,
      observacao TEXT NOT NULL DEFAULT '',
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
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
  await sql`
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      usuario TEXT NOT NULL DEFAULT '',
      acao TEXT NOT NULL,
      detalhes TEXT NOT NULL DEFAULT '',
      fazenda TEXT NOT NULL DEFAULT '',
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS usuario_fazendas (
      usuario TEXT NOT NULL,
      fazenda TEXT NOT NULL,
      PRIMARY KEY (usuario, fazenda)
    )
  `;
  try {
    const demoSalt = "farmhub_demo_bootstrap";
    const demoHash = `${demoSalt}:${createHash("sha256").update(demoSalt + "teste123").digest("hex")}`;
    await sql`INSERT INTO usuarios (usuario, senha_hash, role) VALUES ('teste', ${demoHash}, 'demo') ON CONFLICT (usuario) DO UPDATE SET senha_hash = ${demoHash}, role = 'demo'`;
    const adminSalt = "farmhub_admin_bootstrap";
    const adminHash = `${adminSalt}:${createHash("sha256").update(adminSalt + "admin").digest("hex")}`;
    await sql`INSERT INTO usuarios (usuario, senha_hash, role) VALUES ('admin', ${adminHash}, 'admin') ON CONFLICT (usuario) DO UPDATE SET senha_hash = ${adminHash}, role = 'admin'`;
  } catch (e) {
    console.error("[initDb] bootstrap error:", e);
  }
}

export async function registrarLog(usuario: string, acao: string, detalhes: string, fazenda = "") {
  const sql = getSql();
  await sql`INSERT INTO logs (usuario, acao, detalhes, fazenda) VALUES (${usuario}, ${acao}, ${detalhes}, ${fazenda})`;
}

export default function sql(
  strings: TemplateStringsArray,
  ...values: any[]
) {
  return getSql()(strings, ...values);
}
