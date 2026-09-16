import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { PageHeader, Loading, Avatar } from "@/components/common/primitives";
import { Toolbar, SearchInput, FilterSelect } from "@/components/common/Filters";
import { cn } from "@/lib/utils";

const ROLE_STYLE = {
  super_admin: "bg-primary/10 text-primary border-primary/20",
  business_admin: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300",
  staff: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300",
  client: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300",
};
const ROLE_LABEL = { super_admin: "Super Admin", business_admin: "Business Admin", staff: "Staff", client: "Client" };

export default function Users() {
  const { businessId } = useApp();
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  useEffect(() => { setUsers(null); api.users(businessId).then(setUsers); }, [businessId]);

  const filtered = useMemo(() => (users || []).filter((u) => (!role || u.role === role) && (!q || (u.name + u.email + (u.team_name || "")).toLowerCase().includes(q.toLowerCase()))), [users, q, role]);
  if (!users) return <Loading label="Loading users" />;

  return (
    <div className="fade-in">
      <PageHeader title="Users & Roles" subtitle="Role-based access enforced at every layer — not just the menu." testid="users-page"
        actions={<span className="text-xs text-muted-foreground tabular-nums">{filtered.length} users</span>} />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} testid="users-search" />
        <FilterSelect label="Role" value={role} onChange={setRole} testid="users-filter-role"
          items={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))} />
      </Toolbar>
      <div className="border border-border rounded-sm bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-surface-sunken border-b border-border">
            {["User", "Email", "Role", "Business", "Team", "Title"].map((h) => <th key={h} className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-3 py-2">{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-border/60 last:border-0 row-hover" data-testid={`user-row-${u.id}`}>
                <td className="px-3 py-2"><span className="inline-flex items-center gap-2"><Avatar src={u.avatar} name={u.name} size={24} />{u.name}</span></td>
                <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{u.email}</td>
                <td className="px-3 py-2"><span className={cn("text-[10px] px-1.5 py-0.5 rounded-sm border", ROLE_STYLE[u.role])}>{ROLE_LABEL[u.role]}</span></td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{u.business_name || "Group"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{u.team_name || "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{u.title || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
