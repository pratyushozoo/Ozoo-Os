import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Loading } from "@/components/common/primitives";
import { TaskTable } from "@/components/tasks/TaskTable";
import { Toolbar, SearchInput, FilterSelect } from "@/components/common/Filters";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_DOT } from "@/components/common/StatusPill";
import { cn } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);

const BUCKETS = {
  today: (t) => t.due_date === today() && !["Delivered", "Published"].includes(t.status),
  upcoming: (t) => t.due_date > today() && !["Delivered", "Published"].includes(t.status),
  overdue: (t) => t.overdue,
  blocked: (t) => t.status === "Blocked",
  in_qa: (t) => t.status === "Internal QA",
  rework: (t) => t.status === "Rework",
  completed: (t) => ["Delivered", "Published"].includes(t.status),
};
const TABS = [["today", "Today"], ["upcoming", "Upcoming"], ["overdue", "Overdue"], ["blocked", "Blocked"], ["in_qa", "In QA"], ["rework", "Rework"], ["completed", "Completed"]];

export default function MyWork() {
  const [tasks, setTasks] = useState(null);
  const [tab, setTab] = useState("today");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");

  useEffect(() => { api.tasks({ mine: true }).then(setTasks); }, []);

  const groups = useMemo(() => {
    if (!tasks || !group) return null;
    let l = tasks.filter(BUCKETS[tab]);
    if (q) l = l.filter((t) => (t.title + t.code + (t.project_name || "")).toLowerCase().includes(q.toLowerCase()));
    const key = { project: "project_name", status: "status", priority: "priority", due: "due_date" }[group];
    const m = {};
    l.forEach((t) => { const g = t[key] || "—"; (m[g] = m[g] || []).push(t); });
    return Object.entries(m).sort();
  }, [group, tasks, tab, q]);

  if (!tasks) return <Loading label="Loading your work" />;

  const counts = Object.fromEntries(TABS.map(([k]) => [k, tasks.filter(BUCKETS[k]).length]));
  let list = tasks.filter(BUCKETS[tab]);
  if (q) list = list.filter((t) => (t.title + t.code + (t.project_name || "")).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fade-in">
      <PageHeader title="My Work" subtitle="What do I need to work on now?" testid="my-work-page" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-sm h-9 mb-4 flex-wrap">
          {TABS.map(([k, l]) => (
            <TabsTrigger key={k} value={k} data-testid={`mywork-tab-${k}`} className="rounded-sm text-xs gap-1.5">
              {STATUS_DOT[{ blocked: "Blocked", in_qa: "Internal QA", rework: "Rework" }[k]] && <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[{ blocked: "Blocked", in_qa: "Internal QA", rework: "Rework" }[k]])} />}
              {l}<span className="text-muted-foreground tabular-nums">{counts[k]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} testid="mywork-search" placeholder="Search my tasks…" />
        <FilterSelect label="Group by" value={group} onChange={setGroup} testid="mywork-group"
          allLabel="No grouping" items={[{ value: "project", label: "Project" }, { value: "status", label: "Status" }, { value: "priority", label: "Priority" }, { value: "due", label: "Due Date" }]} />
      </Toolbar>

      {groups ? (
        <div className="space-y-5">
          {groups.map(([g, items]) => (
            <div key={g}>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{g} <span className="text-muted-foreground/60">({items.length})</span></div>
              <TaskTable tasks={items} columns={["code", "task", "business", "project", "client", "priority", "status", "due"]} />
            </div>
          ))}
        </div>
      ) : (
        <TaskTable tasks={list} columns={["code", "task", "business", "project", "client", "service", "priority", "status", "due"]} />
      )}
    </div>
  );
}
