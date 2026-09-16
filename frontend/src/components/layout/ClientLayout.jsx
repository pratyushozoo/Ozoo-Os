import React from "react";
import { Outlet, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { Avatar, Loading } from "@/components/common/primitives";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

export function ClientLayout() {
  const { user, logout } = useAuth();
  const { boot } = useApp();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-12 border-b border-border bg-card flex items-center px-6 gap-3 sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-sm bg-primary text-primary-foreground font-mono text-xs font-bold">O</span>
          <span className="font-semibold tracking-tight">OZOO<span className="text-muted-foreground font-normal"> Client Portal</span></span>
        </Link>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button data-testid="user-menu" className="flex items-center gap-2 h-8 pl-1 pr-2 rounded-sm hover:bg-surface-sunken transition-colors duration-150">
                <Avatar src={user.avatar} name={user.name} size={26} />
                <div className="text-left leading-tight hidden sm:block"><div className="text-xs font-medium">{user.name}</div><div className="text-[10px] text-muted-foreground">Client</div></div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel><div className="text-sm">{user.name}</div><div className="text-xs text-muted-foreground font-normal">{user.email}</div></DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="logout-btn" onClick={logout} className="gap-2 text-danger focus:text-danger"><LogOut className="h-4 w-4" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex-1 px-6 py-6 max-w-[1200px] mx-auto w-full">
        <ErrorBoundary>{boot ? <Outlet /> : <Loading label="Loading portal" />}</ErrorBoundary>
      </main>
    </div>
  );
}
