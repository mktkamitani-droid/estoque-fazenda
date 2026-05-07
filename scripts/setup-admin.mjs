import { createHash, randomBytes } from "crypto";
import { neon } from "@neondatabase/serverless";

function hashSenha(senha) {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(salt + senha).digest("hex");
  return `${salt}:${hash}`;
}

const sql = neon(process.env.DATABASE_URL);

await sql`UPDATE usuarios SET role = 'user' WHERE usuario = 'mktkamitani@gmail.com'`;
console.log("mktkamitani atualizado para user");

const adminHash = hashSenha("001122");
await sql`
  INSERT INTO usuarios (usuario, senha_hash, role)
  VALUES ('kamitani@admin.com', ${adminHash}, 'admin')
  ON CONFLICT (usuario) DO UPDATE SET senha_hash = EXCLUDED.senha_hash, role = 'admin'
`;
console.log("kamitani@admin.com criado como admin");
