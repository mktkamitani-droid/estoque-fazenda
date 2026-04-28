import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token || token !== process.env.AUTH_SECRET) {
    redirect("/login");
  }

  return <HomeClient />;
}
