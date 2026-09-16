import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { PageHeader, Loading, fmtDateTime } from "@/components/common/primitives";
import { Toolbar, SearchInput } from "@/components/common/Filters";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuditLog() {
  const { businessId } = useApp();
  const [acts, setActs] = useState(null);
  const [q, setQ] = useState("");
  const [onlyOverride, setOnlyOverride] = useState(false);

  useEffect(() => { setActs(null); api.audit(businessId).then(setActs); }, [businessId]);
  if (!acts) return <Loading label="Loading audit log" />;

  const filtered = acts.filter((a) => (!onlyOverride || a.is_override) && (!q || (a.message + a.task_code + a.actor_name).toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="fade-in">
      <PageHeader title="Audit Log" subtitle="Every important transition. Overrides are never invisible." testid="audit-page"
        actions={<span className="text-xs text-muted-foreground tabular-nums">{filtered.length} events</span>} />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} testid="audit-search" placeholder="Search events…" />
        <label className="flex items-center gap-2 text-xs text-muted-foreground ml-2"><Switch checked={onlyOverride} onCheckedChange={setOnlyOverride} data-testid="audit-override-filter" />Overrides only</label>
      </Toolbar>
      <div className="border border-border rounded-sm bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-surface-sunken border-b border-border">
            {["", "Time", "Task", "Business", "Event", "Actor"].map((h, i) => <th key={i} className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 py-2">{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className={cn("border-b border-border/60 last:border-0 row-hover", a.is_override && "bg-warning/5")} data-testid={`audit-row-${a.id}`}>
                <td className="px-3 py-2 w-6">{a.is_override && <ShieldAlert className="h-4 w-4 text-warning" />}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground font-mono tabular-nums whitespace-nowrap">{fmtDateTime(a.created_at)}</td>
                <td className="px-3 py-2"><Link to={`/tasks/${a.task_id}`} className="font-mono text-xs text-primary">{a.task_code}</Link></td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{a.business_name}</td>
                <td className="px-3 py-2">{a.message}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{a.actor_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
