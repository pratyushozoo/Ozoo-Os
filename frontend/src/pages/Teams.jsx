import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { PageHeader, Loading, Avatar, Progress } from "@/components/common/primitives";
import { cn } from "@/lib/utils";

const LOAD = {
  Overloaded: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300",
  Balanced: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300",
  Available: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300",
};

export default function Teams() {
  const { businessId } = useApp();
  const [teams, setTeams] = useState(null);
  useEffect(() => { setTeams(null); api.teams(businessId).then(setTeams); }, [businessId]);
  if (!teams) return <Loading label="Loading teams" />;

  return (
    <div className="fade-in">
      <PageHeader title="My Teams" subtitle="Capacity vs assigned work — who's overloaded, balanced or available." testid="teams-page" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {teams.map((t) => (
          <div key={t.id} className="bg-card border border-border rounded-sm" data-testid={`team-card-${t.id}`}>
            <div className="flex items-center justify-between px-4 h-11 border-b border-border">
              <div><div className="font-semibold text-sm">{t.name}</div><div className="text-[11px] text-muted-foreground">{t.business_name} · {t.department_name} · Lead: {t.lead_name || "—"}</div></div>
              <span className={cn("text-xs px-2 py-0.5 rounded-sm border", LOAD[t.load])}>{t.load}</span>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between text-xs mb-1"><span className="text-muted-foreground">Capacity vs Assigned</span><span className="tabular-nums font-medium">{t.assigned}/{t.capacity}</span></div>
              <Progress value={(t.assigned / t.capacity) * 100} className="mb-3" />
              <div className="grid grid-cols-4 gap-2 text-center mb-3">
                <S n={t.member_count} l="People" /><S n={t.active_tasks} l="Active" /><S n={t.overdue} l="Overdue" tone={t.overdue ? "danger" : ""} /><S n={t.blocked} l="Blocked" tone={t.blocked ? "warning" : ""} />
              </div>
              <div className="space-y-1 border-t border-border/60 pt-2">
                {t.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5 text-sm py-0.5">
                    <Avatar src={m.avatar} name={m.name} size={24} />
                    <span className="flex-1">{m.name}<span className="text-xs text-muted-foreground ml-1.5">{m.title}</span></span>
                    <span className="text-xs text-muted-foreground tabular-nums">{m.active} active</span>
                  </div>
                ))}
                {t.members.length === 0 && <div className="text-xs text-muted-foreground">No members assigned.</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
const S = ({ n, l, tone }) => <div className="bg-surface-sunken rounded-sm py-1.5"><div className={cn("text-base font-semibold tabular-nums", tone === "danger" && "text-danger", tone === "warning" && "text-warning")}>{n}</div><div className="text-[10px] text-muted-foreground uppercase tracking-wide">{l}</div></div>;
