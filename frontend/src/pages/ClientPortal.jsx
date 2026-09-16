import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { Loading, KPI, fmtDate, WorkspaceBadge } from "@/components/common/primitives";
import { StatusPill } from "@/components/common/StatusPill";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FolderKanban, PackageCheck, Clock, CheckCircle2 } from "lucide-react";

export default function ClientPortal() {
  const { user } = useAuth();
  const { businesses } = useApp();
  const nav = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([api.client(user.client_id), api.tasks({})]).then(([c, tasks]) => setData({ c, tasks }));
  }, [user.client_id]);
  if (!data) return <Loading label="Loading your workspace" />;

  const { c, tasks } = data;
  const deliverables = tasks.filter((t) => ["Ready for Delivery", "Delivered", "Published"].includes(t.status));
  const awaiting = tasks.filter((t) => t.status === "Ready for Delivery");

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Welcome, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your projects and deliverables across {c.business_names.filter(Boolean).join(" & ")}.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPI label="Projects" value={c.projects.length} icon={FolderKanban} tone="accent" />
        <KPI label="In Progress" value={tasks.filter((t) => !["Delivered", "Published"].includes(t.status)).length} icon={Clock} />
        <KPI label="Awaiting Review" value={awaiting.length} icon={PackageCheck} tone="warning" />
        <KPI label="Delivered" value={tasks.filter((t) => ["Delivered", "Published"].includes(t.status)).length} icon={CheckCircle2} tone="success" />
      </div>

      {awaiting.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><PackageCheck className="h-4 w-4 text-warning" />Awaiting your review</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {awaiting.map((t) => (
              <button key={t.id} data-testid={`portal-review-${t.code}`} onClick={() => nav(`/tasks/${t.id}`)}
                className="text-left bg-card border border-warning/30 rounded-sm p-3 hover:border-warning transition-colors duration-150">
                <div className="flex items-center justify-between mb-1"><span className="font-medium text-sm">{t.title}</span><StatusPill status={t.status} /></div>
                <div className="text-xs text-muted-foreground">{t.project_name} · {t.business_name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="projects">
        <TabsList className="rounded-sm h-9 mb-4">
          <TabsTrigger value="projects" data-testid="portal-tab-projects" className="rounded-sm text-xs">Projects</TabsTrigger>
          <TabsTrigger value="deliverables" data-testid="portal-tab-deliverables" className="rounded-sm text-xs">Deliverables ({deliverables.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {c.projects.map((p) => {
              const accent = businesses.find((b) => b.name === p.business_name)?.accent;
              return (
                <div key={p.id} onClick={() => nav(`/projects/${p.id}`)} data-testid={`portal-project-${p.code}`}
                  className="bg-card border border-border rounded-sm p-4 hover:border-primary/40 transition-colors duration-150 cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <WorkspaceBadge code={businesses.find((b) => b.name === p.business_name)?.code || "?"} accent={accent} size="sm" />
                    <span className="text-xs text-muted-foreground">{p.business_name}</span>
                  </div>
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.service_name} · Due {fmtDate(p.due_date)}</div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="deliverables">
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-surface-sunken border-b border-border">{["Deliverable", "Project", "Business", "Status", "Due"].map((h) => <th key={h} className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 py-2">{h}</th>)}</tr></thead>
              <tbody>
                {deliverables.map((t) => (
                  <tr key={t.id} onClick={() => nav(`/tasks/${t.id}`)} className="border-b border-border/60 last:border-0 cursor-pointer row-hover" data-testid={`portal-deliverable-${t.code}`}>
                    <td className="px-3 py-2 font-medium">{t.title}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{t.project_name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{t.business_name}</td>
                    <td className="px-3 py-2"><StatusPill status={t.status} /></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">{fmtDate(t.due_date)}</td>
                  </tr>
                ))}
                {deliverables.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">No deliverables yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
