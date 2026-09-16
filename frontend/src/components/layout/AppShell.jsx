import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useApp } from "@/context/AppContext";
import { Loading } from "@/components/common/primitives";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export function AppShell() {
  const { boot } = useApp();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 fade-in" onClick={close} data-testid="mobile-nav-overlay" />
          <div className="relative h-full drawer-in shadow-xl">
            <Sidebar onNavigate={close} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="flex-1 overflow-y-auto ozoo-scroll">
          <div className="px-4 sm:px-6 py-4 sm:py-5 max-w-[1600px] mx-auto w-full">
            <ErrorBoundary>{boot ? <Outlet /> : <Loading label="Loading workspace" />}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
