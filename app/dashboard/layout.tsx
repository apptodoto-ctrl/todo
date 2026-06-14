import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { SessionProvider } from "next-auth/react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 relative">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
