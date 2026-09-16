import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { PageHeader, Loading, WorkspaceBadge } from "@/components/common/primitives";
import { Toolbar, SearchInput } from "@/components/common/Filters";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

export default function Clients() {
  const { businessId, businesses } = useApp();
  const nav = useNavigate();
  const [clients, setClients] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => { setClients(null); api.clients(businessId).then(setClients); }, [businessId]);
  const accentFor = (name) => businesses.find((b) => b.name === name)?.accent || "slate";

  const filtered = useMemo(() => (clients || []).filter((c) => !q || (c.name + c.code + (c.industry || "")).toLowerCase().includes(q.toLowerCase())), [clients, q]);
  if (!clients) return <Loading label="Loading clients" />;

  return (
    <div className="fade-in">
      <PageHeader title="Clients" subtitle="Group-level client accounts — one account, multiple business relationships." testid="clients-page"
        actions={<span className="text-xs text-muted-foreground tabular-nums">{filtered.length} clients</span>} />
      <Toolbar><SearchInput value={q} onChange={setQ} testid="clients-search" /></Toolbar>
      <div className="border border-border rounded-sm bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-surface-sunken border-b border-border">
            {["Client", "ID", "Industry", "Business Relationships", "Active Projects", "Active Tasks", "Overdue"].map((h) =>
              <th key={h} className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 py-2 whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} data-testid={`client-row-${c.code}`} onClick={() => nav(`/clients/${c.id}`)} className="border-b border-border/60 last:border-0 cursor-pointer row-hover">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2"><span className="font-mono text-xs text-primary">{c.code}</span></td>
                <td className="px-3 py-2 text-muted-foreground text-xs">{c.industry}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    {c.business_names.map((n) => <span key={n} className={cn("text-[10px] px-1.5 py-0.5 rounded-sm border", n && "border-border")}>{n}</span>)}
                    {c.business_names.length > 1 && <span className="text-[10px] text-primary font-medium ml-1">Cross-business</span>}
                  </div>
                </td>
                <td className="px-3 py-2 tabular-nums">{c.active_projects}</td>
                <td className="px-3 py-2 tabular-nums">{c.active_tasks}</td>
                <td className={cn("px-3 py-2 tabular-nums", c.overdue_tasks > 0 && "text-danger font-medium")}>{c.overdue_tasks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
