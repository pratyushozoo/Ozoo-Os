import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { PageHeader, Loading } from "@/components/common/primitives";
import { TaskTable } from "@/components/tasks/TaskTable";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { Toolbar, SearchInput, FilterSelect, ViewToggle } from "@/components/common/Filters";
import { List, Trello } from "lucide-react";

const STATUSES = ["Brief", "In Production", "Internal QA", "Ready for Delivery", "Delivered", "Published", "Blocked", "Rework"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];

export default function Tasks() {
  const { user } = useAuth();
  const { businessId, lists } = useApp();
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState(null);
  const [view, setView] = useState("list");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(params.get("status") || "");
  const [priority, setPriority] = useState("");
  const [service, setService] = useState("");
  const [onlyOverdue, setOnlyOverdue] = useState(params.get("filter") === "overdue");

  const load = () => api.tasks({ business_id: businessId }).then(setTasks);
  useEffect(() => { setTasks(null); load(); }, [businessId]);
  useEffect(() => { setStatus(params.get("status") || ""); setOnlyOverdue(params.get("filter") === "overdue"); }, [params]);

  const filtered = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) =>
      (!status || t.status === status) &&
      (!priority || t.priority === priority) &&
      (!service || t.service_id === service) &&
      (!onlyOverdue || t.overdue) &&
      (!q || (t.title + t.code + (t.client_name || "") + (t.project_name || "")).toLowerCase().includes(q.toLowerCase()))
    );
  }, [tasks, status, priority, service, onlyOverdue, q]);

  if (!tasks) return <Loading label="Loading tasks" />;
  const canCreate = user.role !== "client";

  return (
    <div className="fade-in">
      <PageHeader title="Tasks" subtitle="The global task engine — one accountable owner per task." testid="tasks-page"
        actions={canCreate && <CreateTaskDialog onCreated={load} />} />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} testid="tasks-search" />
        <FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setParams(v ? { status: v } : {}); }} testid="tasks-filter-status" items={STATUSES.map((s) => ({ value: s, label: s }))} />
        <FilterSelect label="Priority" value={priority} onChange={setPriority} testid="tasks-filter-priority" items={PRIORITIES.map((s) => ({ value: s, label: s }))} width="w-32" />
        <FilterSelect label="Service" value={service} onChange={setService} testid="tasks-filter-service" items={lists.services.map((s) => ({ value: s.id, label: s.name }))} />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">{filtered.length} tasks</span>
          <ViewToggle value={view} onChange={setView} testid="tasks-view-toggle"
            options={[{ value: "list", label: "List", icon: List }, { value: "board", label: "Board", icon: Trello }]} />
        </div>
      </Toolbar>
      {view === "list"
        ? <TaskTable tasks={filtered} columns={["business", "code", "task", "team", "owner", "client", "project", "status", "priority", "due"]} />
        : <KanbanBoard tasks={filtered} onChange={load} />}
    </div>
  );
}
