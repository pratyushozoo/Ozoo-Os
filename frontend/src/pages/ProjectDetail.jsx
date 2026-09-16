import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Loading, Progress, Avatar, fmtDate, timeAgo } from "@/components/common/primitives";
import { StatusPill, STATUS_DOT } from "@/components/common/StatusPill";
import { TaskTable } from "@/components/tasks/TaskTable";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { FileText, Paperclip, Users, GitBranch, Activity as ActIcon, ShieldAlert } from "lucide-react";

const STATUSES = ["Brief", "In Production", "Internal QA", "Ready for Delivery", "Delivered", "Published", "Blocked", "Rework"];

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const load = () => api.project(id).then(setP);
  useEffect(() => { setP(null); load(); }, [id]);
  if (!p) return <Loading label="Loading project" />;

  const meta = [
    ["Business", p.business_name], ["Client", p.client_name], ["Service", p.service_name],
    ["Owner", p.owner_name], ["Deadline", fmtDate(p.due_date)],
  ];

  return (
    <div className="fade-in">
      <PageHeader title={p.name} subtitle={p.description}
        crumbs={[{ label: "OZOO Group", to: "/" }, { label: p.business_name }, { label: "Projects", to: "/projects" }, { label: p.code, mono: true }]}
        testid="project-detail-page"
        actions={<>
          <span className={cn("text-xs px-2 py-1 rounded-sm border", p.health === "At Risk" ? "border-danger/40 text-danger" : "border-border text-muted-foreground")}>{p.health}</span>
          {user.role !== "client" && <CreateTaskDialog defaultProjectId={p.id} onCreated={load} />}
        </>} />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
        {meta.map(([l, v]) => (
          <div key={l} className="bg-card border border-border rounded-sm p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</div>
            <div className="text-sm font-medium mt-0.5 truncate">{v || "—"}</div>
          </div>
        ))}
        <div className="bg-card border border-border rounded-sm p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Progress</div>
          <div className="flex items-center gap-2 mt-1.5"><Progress value={p.progress} /><span className="text-xs tabular-nums">{p.progress}%</span></div>
        </div>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList className="rounded-sm h-9 mb-4">
          {[["tasks", "Tasks", FileText], ["workflow", "Workflow", GitBranch], ["team", "Team", Users], ["files", "Files", Paperclip], ["activity", "Activity", ActIcon]].map(([v, l, Icon]) => (
            <TabsTrigger key={v} value={v} data-testid={`project-tab-${v}`} className="rounded-sm text-xs gap-1.5"><Icon className="h-3.5 w-3.5" />{l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="tasks">
          <TaskTable tasks={p.tasks} columns={["code", "task", "team", "owner", "status", "priority", "due"]} />
        </TabsContent>

        <TabsContent value="workflow">
          <div className="bg-card border border-border rounded-sm divide-y divide-border/60">
            {STATUSES.map((s) => {
              const n = p.workflow[s] || 0;
              return (
                <div key={s} className="flex items-center gap-3 px-4 h-9">
                  <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[s])} />
                  <span className="text-sm w-40">{s}</span>
                  <div className="flex-1"><Progress value={p.tasks.length ? (n / p.tasks.length) * 100 : 0} /></div>
                  <span className="text-sm tabular-nums w-8 text-right">{n}</span>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {p.teams.map((t) => t.name && <div key={t.id} className="bg-card border border-border rounded-sm p-3 text-sm font-medium">{t.name} <span className="text-xs text-muted-foreground font-normal">Team</span></div>)}
          </div>
          <div className="mt-4 bg-card border border-border rounded-sm divide-y divide-border/60">
            {p.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-2">
                <Avatar src={m.avatar} name={m.name} size={28} />
                <div className="flex-1"><div className="text-sm font-medium">{m.name}</div><div className="text-xs text-muted-foreground">{m.title}</div></div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="files">
          <div className="bg-card border border-border rounded-sm p-4 text-sm text-muted-foreground">Project assets are attached at the task level. Open a task to view its deliverables.</div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="bg-card border border-border rounded-sm divide-y divide-border/60">
            {p.activity.length === 0 && <div className="p-4 text-sm text-muted-foreground">No activity yet.</div>}
            {p.activity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                {a.is_override && <ShieldAlert className="h-3.5 w-3.5 text-warning" />}
                <span className="font-mono text-[11px] text-primary w-24 shrink-0">{a.task_code}</span>
                <span className="flex-1 truncate">{a.message}</span>
                <span className="text-xs text-muted-foreground">{a.actor_name}</span>
                <span className="text-[11px] text-muted-foreground/70 tabular-nums">{timeAgo(a.created_at)}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
