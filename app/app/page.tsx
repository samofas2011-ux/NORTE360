import { redirect } from "next/navigation";
import { NorteApp } from "@/components/norte-app";
import { getCurrentSession } from "@/lib/auth";
import { getFullAppData } from "@/lib/product-db";

export const dynamic = "force-dynamic";

export default async function ProtectedAppPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const appData = await getFullAppData(session.user.id, session.user.name);

  return (
    <NorteApp
      initialAppData={appData}
      userName={session.user.name}
    />
  );
}
