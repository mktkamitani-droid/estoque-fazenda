import { createHash, randomBytes } from "crypto";

export function hashSenha(senha: string, salt?: string): string {
  const s = salt ?? randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(s + senha).digest("hex");
  return `${s}:${hash}`;
}

export function verificarSenha(senha: string, armazenado: string): boolean {
  const [salt] = armazenado.split(":");
  return hashSenha(senha, salt) === armazenado;
}
