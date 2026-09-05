import { redirect } from "next/navigation";
import { NorteApp } from "@/components/norte-app";
import { getCurrentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedAppPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return <NorteApp userName={session.user.name} />;
}
