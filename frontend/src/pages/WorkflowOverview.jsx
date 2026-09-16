import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { PageHeader, Loading } from "@/components/common/primitives";
import { STATUS_DOT, StatusPill } from "@/components/common/StatusPill";
import { cn } from "@/lib/utils";

export default function WorkflowOverview() {
  const { businessId } = useApp();
  const [d, setD] = useState(null);
  useEffect(() => { setD(null); api.workflowOverview(businessId).then(setD); }, [businessId]);
  if (!d) return <Loading label="Loading workflow" />;

  const total = Object.values(d.overall).reduce((a, b) => a + b, 0);

  return (
    <div className="fade-in">
      <PageHeader title="Workflow Overview" subtitle="Distribution across the delivery lifecycle — Group and per-business." testid="workflow-overview-page" />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
        {d.statuses.map((s) => (
          <div key={s} className="bg-card border border-border rounded-sm p-3" data-testid={`wf-stat-${s.toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="flex items-center gap-1.5 mb-2"><span className={cn("h-2 w-2 rounded-full", STATUS_DOT[s])} /><span className="text-[10px] text-muted-foreground truncate">{s}</span></div>
            <div className="text-2xl font-semibold tabular-nums">{d.overall[s] || 0}</div>
          </div>
        ))}
      </div>

      {d.per_business.length > 0 && (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="px-4 h-9 flex items-center border-b border-border"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Per Business</span></div>
          <table className="w-full text-sm">
            <thead><tr className="bg-surface-sunken border-b border-border">
              <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 py-2">Business</th>
              {d.statuses.map((s) => <th key={s} className="text-center text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 py-2 whitespace-nowrap">{s}</th>)}
            </tr></thead>
            <tbody>
              {d.per_business.map((b) => (
                <tr key={b.id} className="border-b border-border/60 last:border-0 row-hover">
                  <td className="px-3 py-2 font-medium"><span className="font-mono text-[10px] px-1 py-0.5 rounded-sm bg-secondary mr-1.5">{b.code}</span>{b.name}</td>
                  {d.statuses.map((s) => <td key={s} className="text-center px-2 py-2 tabular-nums text-muted-foreground">{b.counts[s] || "·"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
