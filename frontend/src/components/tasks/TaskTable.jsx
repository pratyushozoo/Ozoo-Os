import React from "react";
import { useNavigate } from "react-router-dom";
import { StatusPill, PriorityPill } from "@/components/common/StatusPill";
import { Avatar, fmtDate } from "@/components/common/primitives";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

const ALL_COLS = ["business", "project", "code", "task", "team", "owner", "client", "service", "status", "priority", "due"];

const HEADERS = {
  business: "Business", project: "Project", code: "Task ID", task: "Task", team: "Team",
  owner: "Owner", client: "Client", service: "Service", status: "Status", priority: "Priority", due: "Due",
};

export function TaskTable({ tasks, columns = ALL_COLS, dense = true }) {
  const nav = useNavigate();
  if (!tasks?.length) {
    return <div className="border border-border rounded-sm bg-card p-8 text-center text-sm text-muted-foreground">No tasks match the current view.</div>;
  }
  return (
    <div className="border border-border rounded-sm bg-card overflow-hidden">
      <div className="overflow-x-auto ozoo-scroll">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface-sunken border-b border-border">
              {columns.map((c) => (
                <th key={c} className="text-left font-medium text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 whitespace-nowrap">
                  {HEADERS[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} data-testid={`task-row-${t.code}`} onClick={() => nav(`/tasks/${t.id}`)}
                className="border-b border-border/60 last:border-0 cursor-pointer row-hover">
                {columns.map((c) => (
                  <td key={c} className={cn("px-3 whitespace-nowrap", dense ? "py-2" : "py-2.5")}>
                    <Cell col={c} t={t} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ col, t }) {
  switch (col) {
    case "business":
      return <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="font-mono text-[10px] px-1 py-0.5 rounded-sm bg-secondary text-secondary-foreground">{t.business_code}</span>
        <span className="text-muted-foreground truncate max-w-[110px]">{t.business_name}</span>
      </span>;
    case "project":
      return <span className="text-muted-foreground truncate block max-w-[140px]">{t.project_name || "—"}</span>;
    case "code":
      return <span className="font-mono text-xs text-primary">{t.code}</span>;
    case "task":
      return <div className="flex items-center gap-2 max-w-[240px]">
        <span className="font-medium text-foreground truncate">{t.title}</span>
        {t.overdue && <AlertTriangle className="h-3.5 w-3.5 text-danger shrink-0" />}
      </div>;
    case "team":
      return <span className="text-muted-foreground text-xs">{t.team_name || "—"}</span>;
    case "owner":
      return t.owner_name ? <span className="inline-flex items-center gap-1.5 text-xs">
        <Avatar src={t.owner_avatar} name={t.owner_name} size={20} /><span className="truncate max-w-[110px]">{t.owner_name}</span>
      </span> : <span className="text-muted-foreground text-xs">Unassigned</span>;
    case "client":
      return <span className="text-muted-foreground text-xs truncate block max-w-[120px]">{t.client_name || "—"}</span>;
    case "service":
      return <span className="text-muted-foreground text-xs">{t.service_name || "—"}</span>;
    case "status":
      return <StatusPill status={t.status} />;
    case "priority":
      return <PriorityPill priority={t.priority} />;
    case "due":
      return <span className={cn("text-xs tabular-nums", t.overdue ? "text-danger font-medium" : "text-muted-foreground")}>{fmtDate(t.due_date)}</span>;
    default:
      return null;
  }
}
