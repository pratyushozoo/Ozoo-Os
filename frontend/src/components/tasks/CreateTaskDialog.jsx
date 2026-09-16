import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErr } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

const TASK_TYPES = ["Design", "Development", "Content", "SEO", "Consulting", "Generic"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];

export function CreateTaskDialog({ trigger, defaultProjectId, onCreated }) {
  const { user } = useAuth();
  const app = useApp();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ck, setCk] = useState([]);
  const [ckInput, setCkInput] = useState("");
  const [f, setF] = useState({
    title: "", business_id: user.role === "super_admin" ? "" : user.business_id,
    project_id: defaultProjectId || "", service_id: "", owner_id: "", team_id: "",
    task_type: "Generic", priority: "Medium", due_date: "", brief: "", requirements: "",
    client_visible: false,
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const [projects, setProjects] = useState([]);
  React.useEffect(() => {
    if (!open) return;
    api.projects(f.business_id || undefined).then(setProjects).catch(() => {});
  }, [open, f.business_id]);

  const teams = useMemo(() => app.lists.teams.filter((t) => !f.business_id || t.business_id === f.business_id), [app.lists.teams, f.business_id]);
  const users = useMemo(() => app.lists.users.filter((u) => (!f.business_id || u.business_id === f.business_id) && u.role !== "client"), [app.lists.users, f.business_id]);
  const services = app.lists.services;

  const addCk = () => { if (ckInput.trim()) { setCk((c) => [...c, ckInput.trim()]); setCkInput(""); } };

  const submit = async () => {
    setBusy(true);
    try {
      const res = await api.createTask({ ...f, checklist: ck });
      toast.success(`Task ${res.code} created in Brief`);
      setOpen(false);
      setF((p) => ({ ...p, title: "", brief: "", requirements: "" })); setCk([]);
      if (onCreated) onCreated(res); else nav(`/tasks/${res.id}`);
    } catch (e) {
      toast.error(apiErr(e));
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button data-testid="create-task-btn" className="h-8 rounded-sm gap-1.5"><Plus className="h-4 w-4" />Create Task</Button>}</DialogTrigger>
      <DialogContent className="rounded-sm max-w-2xl max-h-[90vh] overflow-y-auto ozoo-scroll">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Tasks start in <b>Brief</b>. All required context must be provided — the system prevents incomplete tasks.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Task title" full>
            <Input data-testid="task-title-input" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Homepage UI" className="h-8 rounded-sm" />
          </Field>
          {user.role === "super_admin" && (
            <Field label="Business">
              <Sel testid="task-business" value={f.business_id} onChange={(v) => { set("business_id", v); set("project_id", ""); set("team_id", ""); set("owner_id", ""); }}
                items={app.businesses.map((b) => ({ value: b.id, label: b.name }))} placeholder="Select business" />
            </Field>
          )}
          <Field label="Project">
            <Sel testid="task-project" value={f.project_id} onChange={(v) => set("project_id", v)}
              items={projects.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))} placeholder="Select project" />
          </Field>
          <Field label="Service">
            <Sel testid="task-service" value={f.service_id} onChange={(v) => set("service_id", v)}
              items={services.map((s) => ({ value: s.id, label: s.name }))} placeholder="Select service" />
          </Field>
          <Field label="Team">
            <Sel testid="task-team" value={f.team_id} onChange={(v) => set("team_id", v)}
              items={teams.map((t) => ({ value: t.id, label: t.name }))} placeholder="Select team" />
          </Field>
          <Field label="Owner (accountable)">
            <Sel testid="task-owner" value={f.owner_id} onChange={(v) => set("owner_id", v)}
              items={users.map((u) => ({ value: u.id, label: `${u.name} · ${u.title || u.role}` }))} placeholder="Assign owner" />
          </Field>
          <Field label="Task type">
            <Sel testid="task-type" value={f.task_type} onChange={(v) => set("task_type", v)} items={TASK_TYPES.map((t) => ({ value: t, label: t }))} />
          </Field>
          <Field label="Priority">
            <Sel testid="task-priority" value={f.priority} onChange={(v) => set("priority", v)} items={PRIORITIES.map((p) => ({ value: p, label: p }))} />
          </Field>
          <Field label="Due date">
            <Input data-testid="task-due" type="date" value={f.due_date} onChange={(e) => set("due_date", e.target.value)} className="h-8 rounded-sm" />
          </Field>
          <Field label="Brief" full>
            <Textarea data-testid="task-brief" value={f.brief} onChange={(e) => set("brief", e.target.value)} placeholder="What needs to be done?" className="rounded-sm min-h-[70px]" />
          </Field>
          <Field label="Requirements" full>
            <Textarea value={f.requirements} onChange={(e) => set("requirements", e.target.value)} placeholder="Detailed requirements (optional)" className="rounded-sm min-h-[60px]" />
          </Field>
          <Field label="Mandatory checklist" full>
            <div className="flex gap-2">
              <Input value={ckInput} onChange={(e) => setCkInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCk())} placeholder="Add checklist item + Enter" className="h-8 rounded-sm" />
              <Button type="button" variant="outline" className="h-8 rounded-sm" onClick={addCk}>Add</Button>
            </div>
            {ck.length > 0 && <ul className="mt-2 space-y-1">
              {ck.map((c, i) => <li key={i} className="flex items-center justify-between text-sm bg-surface-sunken rounded-sm px-2 py-1">
                <span>{c}</span>
                <button onClick={() => setCk((x) => x.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
              </li>)}
            </ul>}
          </Field>
          <div className="col-span-2 flex items-center justify-between bg-surface-sunken rounded-sm px-3 py-2">
            <div><Label className="text-sm">Client-visible</Label><p className="text-xs text-muted-foreground">Expose progress in the client portal.</p></div>
            <Switch data-testid="task-client-visible" checked={f.client_visible} onCheckedChange={(v) => set("client_visible", v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="h-8 rounded-sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button data-testid="task-submit" className="h-8 rounded-sm" disabled={busy} onClick={submit}>Create Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Field = ({ label, children, full }) => (
  <div className={full ? "col-span-2" : ""}>
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <div className="mt-1">{children}</div>
  </div>
);

const Sel = ({ value, onChange, items, placeholder, testid }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger data-testid={testid} className="h-8 rounded-sm"><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent className="max-h-64">
      {items.map((it) => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}
    </SelectContent>
  </Select>
);
