import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen">
      <Sidebar userName={user.fullName} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background px-4 pb-4 pt-18 sm:px-6 sm:pb-6 lg:px-8 lg:pt-6">
        {children}
      </main>
    </div>
  );
}
