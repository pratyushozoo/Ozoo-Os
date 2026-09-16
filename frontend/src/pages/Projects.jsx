import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { PageHeader, Loading, Progress, Avatar, fmtDate } from "@/components/common/primitives";
import { StatusPill } from "@/components/common/StatusPill";
import { Toolbar, SearchInput, FilterSelect } from "@/components/common/Filters";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

const HEALTH = {
  Healthy: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300",
  "At Risk": "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300",
  Complete: "bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-500/20 dark:text-slate-300",
};

export default function Projects() {
  const { businessId } = useApp();
  const nav = useNavigate();
  const [projects, setProjects] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => { setProjects(null); api.projects(businessId).then(setProjects); }, [businessId]);

  const filtered = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) =>
      (!status || p.status === status) &&
      (!q || (p.name + p.code + (p.client_name || "")).toLowerCase().includes(q.toLowerCase())));
  }, [projects, q, status]);

  if (!projects) return <Loading label="Loading projects" />;

  return (
    <div className="fade-in">
      <PageHeader title="Projects" subtitle="Containers for work — clients, services and delivery." testid="projects-page"
        actions={<span className="text-xs text-muted-foreground tabular-nums">{filtered.length} projects</span>} />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} testid="projects-search" />
        <FilterSelect label="Status" value={status} onChange={setStatus} testid="projects-filter-status"
          items={["On Track", "At Risk", "Completed"].map((s) => ({ value: s, label: s }))} />
      </Toolbar>
      <div className="border border-border rounded-sm bg-card overflow-hidden">
        <div className="overflow-x-auto ozoo-scroll">
          <table className="w-full text-sm">
            <thead><tr className="bg-surface-sunken border-b border-border">
              {["Business", "Project ID", "Project", "Client", "Service", "Owner", "Progress", "Health", "Due", "Tasks"].map((h) =>
                <th key={h} className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 py-2 whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} data-testid={`project-row-${p.code}`} onClick={() => nav(`/projects/${p.id}`)} className="border-b border-border/60 last:border-0 cursor-pointer row-hover">
                  <td className="px-3 py-2 whitespace-nowrap"><span className="font-mono text-[10px] px-1 py-0.5 rounded-sm bg-secondary">{p.business_code}</span> <span className="text-muted-foreground text-xs">{p.business_name}</span></td>
                  <td className="px-3 py-2"><span className="font-mono text-xs text-primary">{p.code}</span></td>
                  <td className="px-3 py-2 font-medium max-w-[200px] truncate">{p.name}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{p.client_name}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{p.service_name}</td>
                  <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5 text-xs"><Avatar src={p.owner_avatar} name={p.owner_name} size={20} />{p.owner_name}</span></td>
                  <td className="px-3 py-2 w-32"><div className="flex items-center gap-2"><Progress value={p.progress} className="w-16" /><span className="text-[11px] tabular-nums text-muted-foreground">{p.progress}%</span></div></td>
                  <td className="px-3 py-2"><span className={cn("text-xs px-2 py-0.5 rounded-sm border", HEALTH[p.health])}>{p.health}</span></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">{fmtDate(p.due_date)}</td>
                  <td className="px-3 py-2 text-xs tabular-nums">{p.active_tasks}<span className="text-muted-foreground">/{p.total_tasks}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
