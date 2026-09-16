import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { Search, Bell, Sun, Moon, CheckCheck, Menu, X, ChevronDown, Building2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkspaceBadge } from "@/components/common/primitives";
import { cn } from "@/lib/utils";

function GlobalSearch({ autoFocus, onClose }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    const t = setTimeout(() => api.search(q).then((r) => { setRes(r); setOpen(true); }), 250);
    return () => clearTimeout(t);
  }, [q]);
  const go = (path) => { setOpen(false); setQ(""); onClose?.(); nav(path); };
  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input data-testid="global-search" value={q} onChange={(e) => setQ(e.target.value)} autoFocus={autoFocus}
        onFocus={() => res && setOpen(true)} placeholder="Search tasks, projects, clients…"
        className="h-8 pl-8 text-sm bg-surface-sunken border-border rounded-sm" />
      {open && res && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-sm shadow-lg max-h-96 overflow-y-auto ozoo-scroll" onMouseLeave={() => setOpen(false)}>
          {["tasks", "projects", "clients"].every((k) => (res[k] || []).length === 0) && <div className="p-3 text-xs text-muted-foreground">No results for "{q}".</div>}
          {(res.tasks || []).length > 0 && <Group label="Tasks" items={res.tasks} render={(t) => (
            <button key={t.id} data-testid={`search-task-${t.code}`} onClick={() => go(`/tasks/${t.id}`)} className="w-full flex items-center gap-2 px-3 h-9 hover:bg-surface-sunken text-sm">
              <span className="font-mono text-xs text-muted-foreground">{t.code}</span><span className="truncate flex-1 text-left">{t.title}</span><span className="text-[10px] text-muted-foreground">{t.business_name}</span>
            </button>)} />}
          {(res.projects || []).length > 0 && <Group label="Projects" items={res.projects} render={(p) => (
            <button key={p.id} onClick={() => go(`/projects/${p.id}`)} className="w-full flex items-center gap-2 px-3 h-9 hover:bg-surface-sunken text-sm">
              <span className="font-mono text-xs text-muted-foreground">{p.code}</span><span className="truncate flex-1 text-left">{p.name}</span></button>)} />}
          {(res.clients || []).length > 0 && <Group label="Clients" items={res.clients} render={(c) => (
            <button key={c.id} onClick={() => go(`/clients/${c.id}`)} className="w-full flex items-center gap-2 px-3 h-9 hover:bg-surface-sunken text-sm">
              <span className="font-mono text-xs text-muted-foreground">{c.code}</span><span className="truncate flex-1 text-left">{c.name}</span></button>)} />}
        </div>
      )}
    </div>
  );
}
const Group = ({ label, items, render }) => (
  <div><div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>{items.map(render)}</div>
);

function Notifications() {
  const [items, setItems] = useState([]);
  const load = () => api.notifications().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  const unread = items.filter((n) => !n.read).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button data-testid="notifications-btn" className="relative h-8 w-8 inline-flex items-center justify-center rounded-sm hover:bg-surface-sunken transition-colors duration-150">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">{unread}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 h-9 border-b border-border">
          <span className="text-sm font-medium">Notifications</span>
          {unread > 0 && <button onClick={() => api.readAll().then(load)} className="text-xs text-primary flex items-center gap-1"><CheckCheck className="h-3 w-3" />Mark all read</button>}
        </div>
        <div className="max-h-80 overflow-y-auto ozoo-scroll">
          {items.length === 0 && <div className="p-4 text-xs text-muted-foreground">You're all caught up.</div>}
          {items.map((n) => (
            <div key={n.id} className={cn("px-3 py-2 border-b border-border/60 text-sm", !n.read && "bg-primary/5")}>
              <p className="text-foreground">{n.message}</p><span className="text-[10px] text-muted-foreground uppercase tracking-wide">{n.type}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggle = () => {
    const el = document.documentElement; el.classList.toggle("dark");
    const d = el.classList.contains("dark"); setDark(d);
    localStorage.setItem("ozoo_theme", d ? "dark" : "light");
  };
  return (
    <button data-testid="theme-toggle" onClick={toggle} className="h-8 w-8 inline-flex items-center justify-center rounded-sm hover:bg-surface-sunken transition-colors duration-150">
      {dark ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

/** Pill shown in the header: "● OZOO GROUP / Brand Studio ▾" */
function CompanySwitcher() {
  const { user } = useAuth();
  const { businesses, business, setBusiness } = useApp();
  const canSwitch = user.role === "super_admin";

  const groupName = "OZOO GROUP";
  const current = business === "all" ? null : businesses.find((b) => b.id === business);
  const subLabel = current ? current.name : "All Businesses";

  // Accent dot color matching the WorkspaceBadge accent
  const ACCENT_DOT = {
    indigo: "#4f46e5", teal: "#0d9488", pink: "#db2777",
    blue: "#2563eb", amber: "#d97706", slate: "#475569",
  };
  const dotColor = current ? (ACCENT_DOT[current.accent] || ACCENT_DOT.indigo) : "#4f46e5";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={!canSwitch}>
        <button
          data-testid="header-company-switcher"
          className={cn(
            "flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-border bg-surface-sunken text-sm font-medium transition-colors duration-150",
            canSwitch ? "hover:bg-secondary cursor-pointer" : "cursor-default"
          )}
        >
          {/* colored dot */}
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: dotColor }}
          />
          {/* Group / Sub-business label */}
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
            {groupName}
          </span>
          {current && (
            <>
              <span className="text-muted-foreground text-xs">/</span>
              <span className="text-xs text-muted-foreground max-w-[120px] truncate">{subLabel}</span>
            </>
          )}
          {canSwitch && <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5 shrink-0" />}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Switch Company / Business
        </DropdownMenuLabel>

        {/* All Businesses option */}
        <DropdownMenuItem
          data-testid="header-context-all"
          onClick={() => setBusiness("all")}
          className="gap-2"
        >
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-sm bg-primary text-primary-foreground">
            <Building2 className="h-3.5 w-3.5" />
          </span>
          <span className="flex-1">All Businesses</span>
          {business === "all" && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>

        {businesses.length > 0 && <DropdownMenuSeparator />}

        {businesses.map((b) => (
          <DropdownMenuItem
            key={b.id}
            data-testid={`header-context-${b.code}`}
            onClick={() => setBusiness(b.id)}
            className="gap-2"
          >
            <WorkspaceBadge code={b.code} accent={b.accent} size="sm" />
            <span className="flex-1 truncate">{b.name}</span>
            {business === b.id && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopBar({ onMenu }) {
  const [mobileSearch, setMobileSearch] = useState(false);

  return (
    <header className="h-12 shrink-0 border-b border-border bg-card flex items-center gap-2 sm:gap-3 px-3 sm:px-4">
      <button data-testid="mobile-menu-btn" onClick={onMenu} className="lg:hidden h-8 w-8 inline-flex items-center justify-center rounded-sm hover:bg-surface-sunken">
        <Menu className="h-5 w-5" />
      </button>

      {/* Company Switcher pill */}
      <CompanySwitcher />

      <div className="h-5 w-px bg-border mx-1 hidden md:block" />

      {/* Global Search */}
      <div className="flex-1 hidden md:block"><GlobalSearch /></div>
      <div className="flex-1 md:hidden" />

      {/* Mobile search toggle */}
      <button data-testid="mobile-search-btn" onClick={() => setMobileSearch((v) => !v)} className="md:hidden h-8 w-8 inline-flex items-center justify-center rounded-sm hover:bg-surface-sunken">
        {mobileSearch ? <X className="h-4 w-4 text-muted-foreground" /> : <Search className="h-4 w-4 text-muted-foreground" />}
      </button>

      <ThemeToggle />
      <Notifications />

      {mobileSearch && (
        <div className="md:hidden absolute left-0 right-0 top-12 z-40 bg-card border-b border-border p-2 fade-in">
          <GlobalSearch autoFocus onClose={() => setMobileSearch(false)} />
        </div>
      )}
    </header>
  );
}
