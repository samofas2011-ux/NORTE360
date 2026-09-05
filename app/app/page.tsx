import { redirect } from "next/navigation";
import { NorteApp } from "@/components/norte-app";
import { getCurrentSession } from "@/lib/auth";
import { getUserFinancialData } from "@/lib/product-db";

export const dynamic = "force-dynamic";

export default async function ProtectedAppPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const financialData = await getUserFinancialData(session.user.id);

  return (
    <NorteApp
      hasSavedProfile={financialData.hasSavedProfile}
      initialInputs={financialData.inputs}
      updatedAt={financialData.updatedAt}
      userName={session.user.name}
    />
  );
}
