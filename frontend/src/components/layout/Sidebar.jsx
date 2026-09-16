import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { WorkspaceBadge, Avatar } from "@/components/common/primitives";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ListChecks, Users, FolderKanban, CheckSquare, Boxes,
  UsersRound, BarChart3, GitBranch, ShieldCheck, ScrollText, Layers,
  ChevronsUpDown, Building2, Check, Settings as SettingsIcon, LogOut, MoreVertical,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const S = (label) => ({ type: "section", label });
const L = (label, to, icon) => ({ type: "link", label, to, icon });

const NAV = {
  super_admin: [
    L("Dashboard", "/", LayoutDashboard),
    L("My Work", "/my-work", ListChecks),
    L("Tasks", "/tasks", CheckSquare),
    S("Workspace"),
    L("Projects", "/projects", FolderKanban),
    L("Group Work", "/group-work", Layers),
    L("Clients", "/clients", Users),
    L("Services", "/services", Boxes),
    S("Insights"),
    L("Workflow", "/workflow", GitBranch),
    L("Reports", "/reports", BarChart3),
    L("Audit Log", "/audit", ScrollText),
    S("Group Control"),
    L("Users & Roles", "/users", ShieldCheck),
    L("Settings", "/settings", SettingsIcon),
  ],
  business_admin: [
    L("Dashboard", "/", LayoutDashboard),
    L("My Work", "/my-work", ListChecks),
    L("Tasks", "/tasks", CheckSquare),
    S("Workspace"),
    L("Projects", "/projects", FolderKanban),
    L("Clients", "/clients", Users),
    L("Services", "/services", Boxes),
    L("My Teams", "/teams", UsersRound),
    S("Insights"),
    L("Workflow", "/workflow", GitBranch),
    L("Reports", "/reports", BarChart3),
    L("Audit Log", "/audit", ScrollText),
    S("Manage"),
    L("Settings", "/settings", SettingsIcon),
  ],
  staff: [
    L("Dashboard", "/", LayoutDashboard),
    L("My Work", "/my-work", ListChecks),
    L("Tasks", "/tasks", CheckSquare),
    S("Workspace"),
    L("Projects", "/projects", FolderKanban),
    L("My Team", "/teams", UsersRound),
    L("Clients", "/clients", Users),
    S("Account"),
    L("Settings", "/settings", SettingsIcon),
  ],
};

const ROLE_LABEL = { super_admin: "Super Admin", business_admin: "Business Admin", staff: "Team Member", client: "Client" };

function ContextSwitcher({ onNavigate }) {
  const { user } = useAuth();
  const { businesses, business, setBusiness, businessId } = useApp();
  const current = business === "all" ? null : businesses.find((b) => b.id === business);
  const canSwitch = user.role === "super_admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={!canSwitch}>
        <button data-testid="context-switcher" className={cn(
          "w-full flex items-center gap-2.5 px-3 h-16 border-b border-border hover:bg-card transition-colors duration-150",
          !canSwitch && "cursor-default hover:bg-transparent"
        )}>
          {current
            ? <WorkspaceBadge code={current.code} accent={current.accent} size="lg" />
            : <span className="inline-flex items-center justify-center h-9 w-9 rounded-md bg-primary text-primary-foreground"><Building2 className="h-4 w-4" /></span>}
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-semibold truncate leading-tight">{current ? current.name : "OZOO Group"}</div>
            <div className="text-[11px] text-muted-foreground truncate leading-tight">{current ? current.kind : canSwitch ? "Group Workspace" : "Workspace"}</div>
          </div>
          {canSwitch && <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">Switch Context</DropdownMenuLabel>
        <DropdownMenuItem data-testid="context-option-all" onClick={() => { setBusiness("all"); onNavigate?.(); }} className="gap-2">
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-sm bg-primary text-primary-foreground"><Building2 className="h-3.5 w-3.5" /></span>
          <span className="flex-1">All Businesses</span>
          {business === "all" && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {businesses.map((b) => (
          <DropdownMenuItem key={b.id} data-testid={`context-option-${b.code}`} onClick={() => { setBusiness(b.id); onNavigate?.(); }} className="gap-2">
            <WorkspaceBadge code={b.code} accent={b.accent} size="sm" />
            <span className="flex-1 truncate">{b.name}</span>
            {businessId === b.id && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserProfile() {
  const { user, logout } = useAuth();
  return (
    <div className="border-t border-border p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button data-testid="sidebar-user-menu" className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-card transition-colors duration-150">
            <Avatar src={user.avatar} name={user.name} size={34} />
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium truncate leading-tight">{user.name}</div>
              <div className="text-[11px] text-muted-foreground truncate leading-tight">{ROLE_LABEL[user.role]}</div>
            </div>
            <MoreVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56">
          <DropdownMenuLabel><div className="text-sm">{user.name}</div><div className="text-xs text-muted-foreground font-normal">{user.email}</div></DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem data-testid="logout-btn" onClick={logout} className="gap-2 text-danger focus:text-danger"><LogOut className="h-4 w-4" />Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const nav = NAV[user.role] || NAV.staff;
  return (
    <aside className="w-64 shrink-0 h-full flex flex-col bg-surface-raised border-r border-border">
      <div className="h-12 flex items-center gap-2 px-3 border-b border-border shrink-0">
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-sm bg-primary text-primary-foreground font-mono text-xs font-bold">O</span>
        <span className="font-semibold tracking-tight text-sm">OZOO<span className="text-muted-foreground font-normal"> Space OS</span></span>
      </div>
      <nav className="flex-1 overflow-y-auto ozoo-scroll py-2.5 px-2.5 space-y-0.5">
        {nav.map((item, i) => {
          if (item.type === "section") {
            return <div key={i} className="px-2 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</div>;
          }
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} onClick={onNavigate}
              data-testid={`nav-${item.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              className={({ isActive }) => cn(
                "group relative flex items-center gap-3 h-9 pl-3 pr-2 rounded-md text-sm transition-colors duration-150",
                isActive ? "bg-card text-foreground font-medium shadow-sm ring-1 ring-border/60" : "text-muted-foreground hover:text-foreground hover:bg-card/70"
              )}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />}
                  <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      <UserProfile />
    </aside>
  );
}
