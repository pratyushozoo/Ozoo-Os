import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { PageHeader, Loading } from "@/components/common/primitives";
import { TaskTable } from "@/components/tasks/TaskTable";
import { Toolbar, SearchInput, FilterSelect } from "@/components/common/Filters";

const STATUSES = ["Brief", "In Production", "Internal QA", "Ready for Delivery", "Delivered", "Published", "Blocked", "Rework"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];

export default function GroupWork() {
  const { businessId, businesses, lists } = useApp();
  const [tasks, setTasks] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [team, setTeam] = useState("");
  const [owner, setOwner] = useState("");

  useEffect(() => { setTasks(null); api.groupWork(businessId).then(setTasks); }, [businessId]);

  const filtered = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) =>
      (!status || t.status === status) &&
      (!priority || t.priority === priority) &&
      (!team || t.team_id === team) &&
      (!owner || t.owner_id === owner) &&
      (!q || (t.title + t.code + (t.client_name || "") + (t.project_name || "")).toLowerCase().includes(q.toLowerCase()))
    );
  }, [tasks, status, priority, team, owner, q]);

  if (!tasks) return <Loading label="Loading Group Work" />;

  return (
    <div className="fade-in">
      <PageHeader title="Group Work" subtitle="Every task across the Group, in one dense table."
        crumbs={[{ label: "OZOO Group", to: "/" }, { label: businessId ? businesses.find((b) => b.id === businessId)?.name : "All Businesses" }, { label: "Group Work" }]}
        testid="group-work-page"
        actions={<span className="text-xs text-muted-foreground tabular-nums">{filtered.length} tasks</span>} />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} testid="groupwork-search" placeholder="Search all tasks…" />
        <FilterSelect label="Status" value={status} onChange={setStatus} testid="filter-status" items={STATUSES.map((s) => ({ value: s, label: s }))} />
        <FilterSelect label="Priority" value={priority} onChange={setPriority} testid="filter-priority" items={PRIORITIES.map((s) => ({ value: s, label: s }))} width="w-32" />
        <FilterSelect label="Team" value={team} onChange={setTeam} testid="filter-team" items={lists.teams.map((t) => ({ value: t.id, label: t.name }))} />
        <FilterSelect label="Owner" value={owner} onChange={setOwner} testid="filter-owner" items={lists.users.filter((u) => u.role !== "client").map((u) => ({ value: u.id, label: u.name }))} width="w-44" />
      </Toolbar>
      <TaskTable tasks={filtered} columns={["business", "project", "code", "task", "team", "owner", "client", "service", "status", "priority", "due"]} />
    </div>
  );
}
