import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErr } from "@/lib/api";
import { toast } from "sonner";
import { STATUS_DOT } from "@/components/common/StatusPill";
import { PriorityPill } from "@/components/common/StatusPill";
import { Avatar, fmtDate } from "@/components/common/primitives";
import { cn } from "@/lib/utils";
import { AlertTriangle, GripVertical } from "lucide-react";

const COLUMNS = ["Brief", "In Production", "Internal QA", "Ready for Delivery", "Delivered", "Published", "Blocked", "Rework"];

// target status -> transition action for a valid single-step forward move
function actionFor(from, to) {
  const map = {
    "Brief|In Production": "start_production",
    "In Production|Internal QA": "submit_qa",
    "Internal QA|Ready for Delivery": "pass_qa",
    "Ready for Delivery|Delivered": "mark_delivered",
    "Delivered|Published": "publish",
    "Rework|In Production": "resume_production",
  };
  if (to === "Blocked") return "mark_blocked";
  return map[`${from}|${to}`];
}

export function KanbanBoard({ tasks, onChange }) {
  const nav = useNavigate();
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);

  const grouped = COLUMNS.map((c) => ({ status: c, items: tasks.filter((t) => t.status === c) }));

  const drop = async (to) => {
    setOver(null);
    const t = drag; setDrag(null);
    if (!t || t.status === to) return;
    const action = actionFor(t.status, to);
    if (!action) {
      toast.error("Workflow step unavailable", { description: `Complete the current stage before moving to ${to}.` });
      return;
    }
    if (action === "mark_blocked") {
      const reason = window.prompt("Reason for blocking this task?", "Waiting for client");
      if (!reason) return;
      try { await api.transition(t.id, { action, reason }); toast.success(`${t.code} blocked`); onChange && onChange(); }
      catch (e) { toast.error(apiErr(e)); }
      return;
    }
    try {
      await api.transition(t.id, { action });
      toast.success(`${t.code} → ${to}`);
      onChange && onChange();
    } catch (e) {
      toast.error("Workflow step unavailable", { description: apiErr(e) });
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto ozoo-scroll pb-2" data-testid="kanban-board">
      {grouped.map((col) => (
        <div key={col.status}
          onDragOver={(e) => { e.preventDefault(); setOver(col.status); }}
          onDragLeave={() => setOver((o) => (o === col.status ? null : o))}
          onDrop={() => drop(col.status)}
          className={cn("w-64 shrink-0 rounded-sm bg-surface-sunken border border-transparent flex flex-col max-h-[calc(100vh-220px)]",
            over === col.status && "border-primary/50 bg-primary/5")}
          data-testid={`kanban-col-${col.status.toLowerCase().replace(/\s+/g, "-")}`}>
          <div className="flex items-center justify-between px-3 h-9 border-b border-border/60 sticky top-0">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[col.status])} />
              <span className="text-xs font-semibold">{col.status}</span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{col.items.length}</span>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto ozoo-scroll flex-1">
            {col.items.map((t) => (
              <div key={t.id} draggable
                onDragStart={() => setDrag(t)}
                onClick={() => nav(`/tasks/${t.id}`)}
                data-testid={`kanban-card-${t.code}`}
                className="group bg-card border border-border rounded-sm p-2.5 cursor-pointer hover:border-primary/40 transition-colors duration-150">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] text-primary">{t.code}</span>
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100" />
                </div>
                <p className="text-sm font-medium leading-snug mb-2 line-clamp-2">{t.title}</p>
                <div className="flex items-center justify-between">
                  <PriorityPill priority={t.priority} />
                  <div className="flex items-center gap-1.5">
                    {t.overdue && <AlertTriangle className="h-3 w-3 text-danger" />}
                    <span className="text-[10px] text-muted-foreground tabular-nums">{fmtDate(t.due_date)}</span>
                    <Avatar src={t.owner_avatar} name={t.owner_name} size={18} />
                  </div>
                </div>
              </div>
            ))}
            {col.items.length === 0 && <div className="text-[11px] text-muted-foreground/60 text-center py-4">Empty</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
