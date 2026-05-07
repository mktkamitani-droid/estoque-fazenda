import { createHmac } from "crypto";
import { cookies } from "next/headers";
import sql from "./db";

export type Session = {
  usuario: string;
  role: "admin" | "user" | "demo";
  fazendas: string[] | null; // null = unrestricted (admin/demo)
};

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get("auth_token")?.value;
  if (!token) return null;

  if (token === process.env.AUTH_SECRET) {
    return { usuario: "admin", role: "admin", fazendas: null };
  }

  if (token.startsWith("user:")) {
    const parts = token.split(":");
    const id = parts[parts.length - 1];
    const hmac = parts.slice(1, -1).join(":");
    const expected = createHmac("sha256", process.env.AUTH_SECRET!).update(id).digest("hex");
    if (hmac !== expected) return null;

    const [user] = await sql`SELECT usuario, role FROM usuarios WHERE id = ${Number(id)}`;
    if (!user) return null;

    if (user.role === "admin") {
      return { usuario: user.usuario, role: "admin", fazendas: null };
    }

    // demo and regular users see only their own farms
    const fazRows = await sql`SELECT nome FROM fazendas WHERE owner = ${user.usuario}`;
    return { usuario: user.usuario, role: user.role, fazendas: fazRows.map((r: any) => r.nome) };
  }

  return null;
}

// Returns null (no WHERE filter) or array of allowed fazendas (may be empty)
export function resolveFazendas(session: Session, requested?: string | null): string[] | null {
  if (session.fazendas === null) {
    return requested ? [requested] : null;
  }
  if (requested) {
    return session.fazendas.includes(requested) ? [requested] : [];
  }
  return session.fazendas;
}
