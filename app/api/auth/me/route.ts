import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return NextResponse.json({ role: null });

  if (token === process.env.AUTH_SECRET) {
    return NextResponse.json({ role: "admin" });
  }

  if (token.startsWith("user:")) {
    const parts = token.split(":");
    const id = parts[parts.length - 1];
    const hmac = parts.slice(1, -1).join(":");
    const esperado = createHmac("sha256", process.env.AUTH_SECRET!).update(id).digest("hex");
    if (hmac === esperado) {
      return NextResponse.json({ role: "user" });
    }
  }

  return NextResponse.json({ role: null });
}
