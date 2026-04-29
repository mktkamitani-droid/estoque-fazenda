import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function tokenValido(token: string): boolean {
  if (token === process.env.AUTH_SECRET) return true;
  if (token.startsWith("user:")) {
    const parts = token.split(":");
    const id = parts[parts.length - 1];
    const hmac = parts.slice(1, -1).join(":");
    const esperado = createHmac("sha256", process.env.AUTH_SECRET!).update(id).digest("hex");
    return hmac === esperado;
  }
  return false;
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token || !tokenValido(token)) {
    redirect("/login");
  }

  return <>{children}</>;
}
