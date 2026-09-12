import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileTabBar from "@/components/layout/MobileTabBar";
import { SessionProvider } from "next-auth/react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      {/* 100dvh evita el salto al aparecer/ocultarse la barra del navegador móvil */}
      <div className="flex h-[100dvh] bg-slate-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto touch-scroll px-4 pt-4 lg:p-6 pb-tabbar relative">
            {children}
          </main>
        </div>
        <MobileTabBar />
      </div>
    </SessionProvider>
  );
}
