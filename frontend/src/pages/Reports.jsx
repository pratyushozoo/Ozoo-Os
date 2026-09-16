import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { PageHeader, Loading, KPI } from "@/components/common/primitives";
import { STATUS_DOT } from "@/components/common/StatusPill";
import { cn } from "@/lib/utils";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { AlertTriangle, Ban, RefreshCw, Timer, CheckCircle2 } from "lucide-react";

export default function Reports() {
  const { businessId } = useApp();
  const [r, setR] = useState(null);
  useEffect(() => { setR(null); api.reports(businessId).then(setR); }, [businessId]);
  if (!r) return <Loading label="Building reports" />;

  const bar = (obj) => Object.entries(obj).map(([name, value]) => ({ name, value }));

  return (
    <div className="fade-in">
      <PageHeader title="Reports" subtitle="Consolidated delivery performance — drill from Group to task." testid="reports-page" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KPI label="Total Tasks" value={r.total} />
        <KPI label="On-time Delivery" value={`${r.on_time_rate}%`} icon={CheckCircle2} tone="success" />
        <KPI label="Rework Rate" value={`${r.rework_rate}%`} icon={RefreshCw} tone="warning" />
        <KPI label="QA Failures" value={r.qa_failures} icon={Timer} />
        <KPI label="Overdue" value={r.overdue} icon={AlertTriangle} tone="danger" />
        <KPI label="Blocked" value={r.blocked} icon={Ban} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Tasks by Business" data={bar(r.by_business)} />
        <ChartCard title="Tasks by Team" data={bar(r.by_team)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="bg-card border border-border rounded-sm">
          <div className="px-4 h-9 flex items-center border-b border-border"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tasks by Status</span></div>
          <div className="p-3 space-y-1.5">
            {Object.entries(r.by_status).map(([s, n]) => (
              <div key={s} className="flex items-center gap-3 text-sm px-1">
                <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[s])} /><span className="w-40">{s}</span>
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${r.total ? (n / r.total) * 100 : 0}%` }} /></div>
                <span className="tabular-nums w-8 text-right">{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-sm">
          <div className="px-4 h-9 flex items-center border-b border-border"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top Owners by Workload</span></div>
          <div className="p-3 space-y-1">
            {Object.entries(r.by_owner).map(([name, n]) => (
              <div key={name} className="flex items-center justify-between text-sm px-1 h-7"><span className="truncate">{name}</span><span className="tabular-nums text-muted-foreground">{n}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, data }) {
  const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
  return (
    <div className="bg-card border border-border rounded-sm">
      <div className="px-4 h-9 flex items-center border-b border-border"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span></div>
      <div className="p-3 h-56">
        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
            <Tooltip cursor={{ fill: "hsl(var(--surface-sunken))" }} contentStyle={{ fontSize: 12, borderRadius: 2, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>{data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
