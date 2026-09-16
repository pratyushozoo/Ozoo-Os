import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const ACCENT = {
  indigo: "bg-indigo-600", teal: "bg-teal-600", pink: "bg-pink-600",
  blue: "bg-blue-600", amber: "bg-amber-600", slate: "bg-slate-600",
};

export function WorkspaceBadge({ code, accent = "indigo", size = "md", className }) {
  const dims = size === "sm" ? "h-6 w-6 text-[10px]" : size === "lg" ? "h-9 w-9 text-sm" : "h-7 w-7 text-xs";
  return (
    <span className={cn("inline-flex items-center justify-center rounded-sm font-mono font-semibold text-white shrink-0", ACCENT[accent] || ACCENT.indigo, dims, className)}>
      {code}
    </span>
  );
}

export function Avatar({ src, name, size = 24, className }) {
  const initials = (name || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return src ? (
    <img src={src} alt={name} style={{ width: size, height: size }}
      className={cn("rounded-sm object-cover shrink-0 border border-border", className)} />
  ) : (
    <span style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={cn("inline-flex items-center justify-center rounded-sm bg-secondary text-secondary-foreground font-medium shrink-0", className)}>
      {initials}
    </span>
  );
}

export function PageHeader({ title, subtitle, crumbs, actions, testid }) {
  return (
    <div data-testid={testid} className="flex items-start justify-between gap-4 pb-4 border-b border-border mb-4">
      <div className="min-w-0">
        {crumbs && <Crumbs items={crumbs} />}
        <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Crumbs({ items }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 flex-wrap" data-testid="breadcrumbs">
      {items.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-border">/</span>}
          {c.to ? (
            <Link to={c.to} className="hover:text-foreground transition-colors duration-150">{c.label}</Link>
          ) : (
            <span className={cn(i === items.length - 1 ? "text-foreground font-medium" : "", c.mono && "font-mono")}>{c.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function KPI({ label, value, sub, icon: Icon, tone = "default", to, testid }) {
  const tones = {
    default: "text-foreground", danger: "text-danger", warning: "text-warning",
    success: "text-success", info: "text-info", accent: "text-primary",
  };
  const inner = (
    <div className="bg-card border border-border rounded-sm p-4 hover:border-primary/40 transition-colors duration-150 h-full" data-testid={testid}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {Icon && <Icon className={cn("h-4 w-4", tones[tone])} />}
      </div>
      <div className={cn("text-2xl font-semibold tracking-tight mt-2 tabular-nums", tones[tone])}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export function Progress({ value, className }) {
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-secondary overflow-hidden", className)}>
      <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${Math.min(100, value || 0)}%` }} />
    </div>
  );
}

export function Loading({ label = "Loading" }) {
  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground gap-2 text-sm" data-testid="loading-state">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}…
    </div>
  );
}

export function Empty({ icon: Icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-state">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground/50 mb-3" />}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1 max-w-sm">{sub}</p>}
    </div>
  );
}

export function fmtDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
  } catch { return "—"; }
}
export function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}
export function timeAgo(iso) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
