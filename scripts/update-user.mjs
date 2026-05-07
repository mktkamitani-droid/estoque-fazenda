import { createHash, randomBytes } from "crypto";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

// Load .env
const env = readFileSync(".env.prod", "utf8");
for (const line of env.split("\n")) {
  const [k, ...v] = line.split("=");
  if (k && v.length) process.env[k.trim()] = v.join("=").trim();
}

function hashSenha(senha) {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(salt + senha).digest("hex");
  return `${salt}:${hash}`;
}

const sql = neon(process.env.DATABASE_URL);
const usuario = "mktkamitani@gmail.com";
const novaSenhaHash = hashSenha("00112233");

const result = await sql`
  UPDATE usuarios SET senha_hash = ${novaSenhaHash}, role = 'admin'
  WHERE usuario = ${usuario.toLowerCase()}
  RETURNING id, usuario, role
`;

if (result.length === 0) {
  console.log("Usuário não encontrado. Criando...");
  await sql`INSERT INTO usuarios (usuario, senha_hash, role) VALUES (${usuario.toLowerCase()}, ${novaSenhaHash}, 'admin')`;
  console.log("Usuário criado como admin.");
} else {
  console.log("Atualizado:", result[0]);
}
