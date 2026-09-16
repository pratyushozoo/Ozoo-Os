import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { PageHeader, KPI, Loading, WorkspaceBadge, timeAgo, Progress } from "@/components/common/primitives";
import { STATUS_DOT, StatusPill } from "@/components/common/StatusPill";
import { cn } from "@/lib/utils";
import {
  Building2, FolderKanban, CheckSquare, CircleCheckBig, AlertTriangle, Ban,
  ClipboardList, Activity as ActivityIcon, ShieldAlert, ArrowRight, TriangleAlert,
} from "lucide-react";

const STATUSES = ["Brief", "In Production", "Internal QA", "Ready for Delivery", "Delivered", "Published", "Blocked", "Rework"];

export default function Dashboard() {
  const { user } = useAuth();
  const { businessId, business, businesses } = useApp();
  const [d, setD] = useState(null);

  useEffect(() => { setD(null); api.dashboard(businessId).then(setD); }, [businessId]);
  if (!d) return <Loading label="Loading dashboard" />;

  const isSuper = user.role === "super_admin";
  const scopeName = business === "all" ? "All Businesses" : businesses.find((b) => b.id === business)?.name;
  const title = isSuper ? (business === "all" ? "Group Dashboard" : `${scopeName} Dashboard`) : "Business Dashboard";
  const sub = isSuper && business === "all" ? "What is happening across the entire Group?" : `What is happening in ${scopeName || "your business"}?`;

  return (
    <div className="fade-in">
      <PageHeader title={title} subtitle={sub}
        crumbs={isSuper ? [{ label: "OZOO Group", to: "/" }, { label: scopeName }] : undefined} testid="dashboard-page" />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {isSuper && business === "all" && <KPI label="Businesses" value={d.businesses_count} icon={Building2} tone="accent" testid="kpi-businesses" />}
        <KPI label="Active Projects" value={d.projects_active} sub={`${d.projects_total} total`} icon={FolderKanban} to="/projects" testid="kpi-projects" />
        <KPI label="Active Tasks" value={d.kpi.active} sub={`${d.kpi.total} total`} icon={CheckSquare} to="/tasks" tone="accent" testid="kpi-active-tasks" />
        <KPI label="Completed" value={d.kpi.completed} icon={CircleCheckBig} tone="success" testid="kpi-completed" />
        <KPI label="Overdue" value={d.kpi.overdue} icon={AlertTriangle} tone="danger" testid="kpi-overdue" />
        <KPI label="Blocked" value={d.kpi.blocked} icon={Ban} tone="warning" testid="kpi-blocked" />
        {!(isSuper && business === "all") && <KPI label="Active Clients" value={d.active_clients} icon={Building2} testid="kpi-clients" />}
      </div>

      {isSuper && business === "all" && d.per_business.length > 0 && (
        <Section title="Businesses" icon={Building2} sub="Active tasks by business — filter or drill in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {d.per_business.map((b) => (
              <div key={b.id} className="bg-card border border-border rounded-sm p-4 hover:border-primary/40 transition-colors duration-150" data-testid={`business-card-${b.code}`}>
                <div className="flex items-center gap-2 mb-3">
                  <WorkspaceBadge code={b.code} accent={b.accent} size="lg" />
                  <div><div className="font-semibold text-sm">{b.name}</div><div className="text-[11px] text-muted-foreground">{b.total} tasks total</div></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat n={b.active} l="Active" />
                  <Stat n={b.overdue} l="Overdue" tone={b.overdue ? "danger" : ""} />
                  <Stat n={b.blocked} l="Blocked" tone={b.blocked ? "warning" : ""} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <Section title="Workflow Overview" icon={ClipboardList} sub="Distribution across the delivery lifecycle">
            <div className="bg-card border border-border rounded-sm divide-y divide-border/60">
              {STATUSES.map((s) => {
                const n = d.workflow[s] || 0;
                const pct = d.kpi.total ? (n / d.kpi.total) * 100 : 0;
                return (
                  <Link to={`/tasks?status=${encodeURIComponent(s)}`} key={s} className="flex items-center gap-3 px-4 h-9 row-hover" data-testid={`workflow-row-${s.toLowerCase().replace(/\s+/g, "-")}`}>
                    <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT[s])} />
                    <span className="text-sm w-40 shrink-0">{s}</span>
                    <div className="flex-1"><Progress value={pct} /></div>
                    <span className="text-sm tabular-nums w-8 text-right font-medium">{n}</span>
                  </Link>
                );
              })}
            </div>
          </Section>
        </div>

        <div>
          <Section title="Needs Attention" icon={TriangleAlert}>
            <div className="bg-card border border-border rounded-sm divide-y divide-border/60">
              <Attn label="Overdue" n={d.needs_attention.overdue} tone="danger" to="/tasks?filter=overdue" />
              <Attn label="Blocked" n={d.needs_attention.blocked} tone="warning" to="/tasks?status=Blocked" />
              <Attn label="In QA" n={d.needs_attention.in_qa} tone="info" to="/tasks?status=Internal QA" />
              <Attn label="Rework" n={d.needs_attention.rework} tone="danger" to="/tasks?status=Rework" />
              <Attn label="Unassigned" n={d.needs_attention.unassigned} to="/tasks" />
            </div>
          </Section>
          {(user.role !== "client") && (
            <Section title="My Work" icon={CheckSquare} className="mt-4">
              <div className="grid grid-cols-2 gap-2">
                <MyStat label="Active" n={d.my_work.active} />
                <MyStat label="Due Today" n={d.my_work.due_today} />
                <MyStat label="Overdue" n={d.my_work.overdue} tone="danger" />
                <MyStat label="Blocked" n={d.my_work.blocked} tone="warning" />
              </div>
              <Link to="/my-work" className="mt-2 inline-flex items-center gap-1 text-xs text-primary">Open My Work <ArrowRight className="h-3 w-3" /></Link>
            </Section>
          )}
        </div>
      </div>

      <Section title="Recent Activity" icon={ActivityIcon}>
        <div className="bg-card border border-border rounded-sm divide-y divide-border/60">
          {d.recent_activity.length === 0 && <div className="p-4 text-sm text-muted-foreground">No recent activity.</div>}
          {d.recent_activity.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-2 text-sm">
              {a.is_override && <ShieldAlert className="h-3.5 w-3.5 text-warning shrink-0" />}
              <span className="font-mono text-[11px] text-primary w-24 shrink-0">{a.task_code}</span>
              <span className="flex-1 truncate">{a.message}</span>
              <span className="text-xs text-muted-foreground shrink-0">{a.actor_name}</span>
              <span className="text-[11px] text-muted-foreground/70 shrink-0 tabular-nums">{timeAgo(a.created_at)}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

const Section = ({ title, sub, icon: Icon, children, className }) => (
  <section className={className}>
    <div className="flex items-center gap-2 mb-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {sub && <span className="text-xs text-muted-foreground">· {sub}</span>}
    </div>
    {children}
  </section>
);
const Stat = ({ n, l, tone }) => (
  <div className="bg-surface-sunken rounded-sm py-1.5">
    <div className={cn("text-base font-semibold tabular-nums", tone === "danger" && "text-danger", tone === "warning" && "text-warning")}>{n}</div>
    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{l}</div>
  </div>
);
const Attn = ({ label, n, tone, to }) => (
  <Link to={to} className="flex items-center justify-between px-4 h-9 row-hover text-sm">
    <span>{label}</span>
    <span className={cn("tabular-nums font-medium", tone === "danger" && "text-danger", tone === "warning" && "text-warning", tone === "info" && "text-info")}>{n}</span>
  </Link>
);
const MyStat = ({ label, n, tone }) => (
  <div className="bg-surface-sunken rounded-sm p-2.5">
    <div className={cn("text-lg font-semibold tabular-nums", tone === "danger" && "text-danger", tone === "warning" && "text-warning")}>{n}</div>
    <div className="text-[11px] text-muted-foreground">{label}</div>
  </div>
);
