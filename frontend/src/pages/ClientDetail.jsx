import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, Loading, fmtDate } from "@/components/common/primitives";
import { TaskTable } from "@/components/tasks/TaskTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function ClientDetail() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  useEffect(() => { setC(null); api.client(id).then(setC); }, [id]);
  if (!c) return <Loading label="Loading client" />;

  const meta = [["Industry", c.industry], ["Contact", c.contact_name], ["Email", c.contact_email], ["Client since", fmtDate(c.since)]];

  return (
    <div className="fade-in">
      <PageHeader title={c.name}
        crumbs={[{ label: "OZOO Group", to: "/" }, { label: "Clients", to: "/clients" }, { label: c.code, mono: true }]}
        subtitle={<div className="flex items-center gap-1.5 mt-1">{c.business_names.map((n) => <span key={n} className="text-[10px] px-1.5 py-0.5 rounded-sm border border-border">{n}</span>)}{c.business_names.length > 1 && <span className="text-[10px] text-primary font-medium">Cross-business account</span>}</div>}
        testid="client-detail-page" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {meta.map(([l, v]) => <div key={l} className="bg-card border border-border rounded-sm p-3"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</div><div className="text-sm font-medium mt-0.5 truncate">{v || "—"}</div></div>)}
      </div>

      <Tabs defaultValue="projects">
        <TabsList className="rounded-sm h-9 mb-4">
          <TabsTrigger value="projects" data-testid="client-tab-projects" className="rounded-sm text-xs">Projects ({c.projects.length})</TabsTrigger>
          <TabsTrigger value="tasks" data-testid="client-tab-tasks" className="rounded-sm text-xs">Tasks ({c.tasks.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="projects">
          <div className="border border-border rounded-sm bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-surface-sunken border-b border-border">{["Business", "Project", "Service", "Status", "Progress", "Due"].map((h) => <th key={h} className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 py-2">{h}</th>)}</tr></thead>
              <tbody>
                {c.projects.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0 row-hover">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{p.business_name}</td>
                    <td className="px-3 py-2 font-medium">{p.name} <span className="font-mono text-[10px] text-primary">{p.code}</span></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{p.service_name}</td>
                    <td className="px-3 py-2 text-xs">{p.status}</td>
                    <td className="px-3 py-2 text-xs tabular-nums">{p.progress}%</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">{fmtDate(p.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="tasks">
          <TaskTable tasks={c.tasks} columns={["business", "code", "task", "project", "owner", "status", "priority", "due"]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
