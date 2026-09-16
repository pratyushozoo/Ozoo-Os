import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { PageHeader, Loading, Avatar, fmtDate, fmtDateTime, timeAgo } from "@/components/common/primitives";
import { StatusPill, PriorityPill } from "@/components/common/StatusPill";
import { WorkflowPanel } from "@/components/tasks/WorkflowPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  FileText, ListChecks, GitBranch, Paperclip, MessageSquare, History, Ban,
  ShieldAlert, Send, CheckCircle2, XCircle, Workflow, BookOpen, Link2, AlertTriangle,
} from "lucide-react";

export default function TaskDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [t, setT] = useState(null);
  const load = () => api.task(id).then(setT);
  useEffect(() => { setT(null); load(); }, [id]);
  if (!t) return <Loading label="Loading task" />;

  const isClient = user.role === "client";
  const org = [t.business_name, t.division, t.department_name, t.team_name, t.owner_name].filter(Boolean);

  return (
    <div className="fade-in">
      <PageHeader
        crumbs={[
          { label: "OZOO Group", to: "/" }, { label: t.business_name },
          t.department_name && { label: t.department_name }, t.team_name && { label: t.team_name },
          t.owner_name && { label: t.owner_name }, { label: t.code, mono: true },
        ].filter(Boolean)}
        title={t.title}
        subtitle={<span className="flex items-center gap-2 flex-wrap">
          <StatusPill status={t.status} /><PriorityPill priority={t.priority} />
          {t.overdue && <span className="inline-flex items-center gap-1 text-danger text-xs"><AlertTriangle className="h-3.5 w-3.5" />Overdue · {fmtDate(t.due_date)}</span>}
        </span>}
        testid="task-detail-page" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Meta l="Client" v={t.client_name} />
            <Meta l="Service" v={t.service_name} />
            <Meta l="Project" v={<Link className="text-primary" to={`/projects/${t.project_id}`}>{t.project_name}</Link>} />
            <Meta l="Due" v={fmtDate(t.due_date)} tone={t.overdue ? "danger" : ""} />
          </div>

          {t.process && (
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-sm px-3 py-2 text-sm">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Process:</span><span className="font-medium">{t.process}</span>
              <span className="ml-auto text-xs text-primary cursor-pointer">View SOP</span>
            </div>
          )}

          <Tabs defaultValue="brief">
            <TabsList className="rounded-sm h-9 flex-wrap">
              {[["brief", "Brief", FileText], ["checklist", "Checklist", ListChecks], ["deps", "Dependencies", GitBranch],
                ["files", "Files", Paperclip], ["comments", "Comments", MessageSquare], !isClient && ["activity", "Activity", History]]
                .filter(Boolean).map(([v, l, Icon]) => (
                  <TabsTrigger key={v} value={v} data-testid={`task-tab-${v}`} className="rounded-sm text-xs gap-1.5"><Icon className="h-3.5 w-3.5" />{l}</TabsTrigger>
                ))}
            </TabsList>

            <TabsContent value="brief" className="space-y-4">
              <Card title="Brief"><p className="text-sm leading-relaxed text-foreground/90">{t.brief || "No brief provided."}</p></Card>
              {!isClient && <Card title="Requirements"><p className="text-sm leading-relaxed text-muted-foreground">{t.requirements || "—"}</p></Card>}
              {t.subtasks?.length > 0 && (
                <Card title={`Subtasks (${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length})`}>
                  <div className="space-y-1">
                    {t.subtasks.map((s) => (
                      <label key={s.id} className="flex items-center gap-2.5 text-sm py-1 cursor-pointer">
                        <Checkbox checked={s.done} disabled={isClient}
                          onCheckedChange={() => api.toggleSubtask(t.id, s.id).then(load)} data-testid={`subtask-${s.id}`} />
                        <span className={cn(s.done && "line-through text-muted-foreground")}>{s.title}</span>
                      </label>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="checklist">
              <Card title={`Checklist — ${t.checklist.filter((c) => c.done).length}/${t.checklist.length} complete`}>
                {t.checklist.length === 0 && <p className="text-sm text-muted-foreground">No checklist items.</p>}
                <div className="space-y-1">
                  {t.checklist.map((c) => (
                    <label key={c.id} className="flex items-center gap-2.5 text-sm py-1.5 border-b border-border/40 last:border-0 cursor-pointer" data-testid={`checklist-item-${c.id}`}>
                      <Checkbox checked={c.done} disabled={isClient} onCheckedChange={() => api.toggleChecklist(t.id, c.id).then(load)} />
                      <span className={cn("flex-1", c.done && "line-through text-muted-foreground")}>{c.text}</span>
                      {c.mandatory && <span className="text-[10px] uppercase tracking-wide text-warning font-medium">Mandatory</span>}
                    </label>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="deps">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <DepCol title="Blocked by" items={t.dependencies?.blocked_by} tone="danger" icon={Ban} />
                <DepCol title="Blocks" items={t.dependencies?.blocks} icon={Link2} />
                <DepCol title="Depends on" items={t.dependencies?.depends_on} icon={GitBranch} />
              </div>
            </TabsContent>

            <TabsContent value="files">
              <Card title={`Attachments (${t.attachments?.length || 0})`}>
                {(!t.attachments || t.attachments.length === 0) && <p className="text-sm text-muted-foreground">No files uploaded yet.</p>}
                <div className="space-y-1">
                  {t.attachments?.map((a) => (
                    <div key={a.id} className="flex items-center gap-2.5 text-sm py-1.5 border-b border-border/40 last:border-0">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="flex-1 font-medium">{a.name}</span>
                      <span className="text-xs text-muted-foreground">{a.size}</span>
                      <span className="text-xs text-muted-foreground">· {a.uploaded_by}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="comments">
              <Comments task={t} isClient={isClient} onDone={load} />
            </TabsContent>

            {!isClient && (
              <TabsContent value="activity">
                <Card title="Activity & Audit Trail">
                  <div className="relative pl-4 space-y-3">
                    <div className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
                    {[...t.activity].reverse().map((a) => (
                      <div key={a.id} className="relative">
                        <span className={cn("absolute -left-4 top-1 h-2.5 w-2.5 rounded-full border-2 border-card", a.is_override ? "bg-warning" : "bg-primary")} />
                        <div className="flex items-center gap-2">
                          {a.is_override && <ShieldAlert className="h-3.5 w-3.5 text-warning" />}
                          <span className="text-sm">{a.message}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">{a.actor_name} · {fmtDateTime(a.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          {isClient
            ? <ClientPanel task={t} onDone={load} />
            : <WorkflowPanel task={t} onDone={load} />}

          {t.status === "Blocked" && t.block_info && (
            <div className="bg-card border border-danger/30 rounded-sm">
              <div className="px-4 h-[34px] flex items-center gap-2 border-b border-border"><Ban className="h-4 w-4 text-danger" /><span className="text-xs font-semibold uppercase tracking-wide text-danger">Blocked</span></div>
              <div className="p-4 space-y-1.5 text-sm">
                <Row l="Reason" v={t.block_info.reason} />
                <Row l="Description" v={t.block_info.description} />
                <Row l="Responsible" v={t.block_info.responsible} />
                <Row l="Expected" v={t.block_info.expected_resolution} />
                <Row l="Was" v={t.block_info.previous_status} />
              </div>
            </div>
          )}

          {!isClient && (
            <div className="bg-card border border-border rounded-sm">
              <div className="px-4 h-[34px] flex items-center gap-2 border-b border-border"><Workflow className="h-4 w-4 text-muted-foreground" /><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Organizational Context</span></div>
              <div className="p-4 space-y-2 text-sm">
                {org.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground w-4">{i + 1}</span>
                    <span className={cn(i === org.length - 1 && "font-medium")}>{o}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1 border-t border-border/60 mt-2"><span className="font-mono text-[10px] text-primary w-4">→</span><span className="font-mono text-xs text-primary">{t.code}</span></div>
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-sm">
            <div className="px-4 h-[34px] flex items-center border-b border-border"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Owner & Teams</span></div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <Avatar src={t.owner_avatar} name={t.owner_name} size={32} />
                <div><div className="text-sm font-medium">{t.owner_name}</div><div className="text-xs text-muted-foreground">Accountable owner</div></div>
              </div>
              {t.participating_team_names?.filter(Boolean).length > 0 && (
                <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Participating teams</div>
                  <div className="flex flex-wrap gap-1.5">{t.participating_team_names.filter(Boolean).map((n, i) => <span key={i} className="text-xs bg-secondary rounded-sm px-2 py-0.5">{n}</span>)}</div></div>
              )}
            </div>
          </div>

          {!isClient && t.rework_info?.count > 0 && (
            <div className="bg-card border border-pink-300 dark:border-pink-500/30 rounded-sm">
              <div className="px-4 h-[34px] flex items-center gap-2 border-b border-border"><History className="h-4 w-4 text-pink-600" /><span className="text-xs font-semibold uppercase tracking-wide text-pink-600">Rework · {t.rework_info.count}×</span></div>
              <div className="p-4 text-sm space-y-2">
                {t.rework_info.history?.map((h, i) => <div key={i} className="text-xs"><p className="text-foreground">"{h.feedback}"</p><span className="text-muted-foreground font-mono">{h.reviewer} · {fmtDateTime(h.at)}</span></div>)}
              </div>
            </div>
          )}

          {t.override_history?.length > 0 && (
            <div className="bg-card border border-warning/40 rounded-sm">
              <div className="px-4 h-[34px] flex items-center gap-2 border-b border-border"><ShieldAlert className="h-4 w-4 text-warning" /><span className="text-xs font-semibold uppercase tracking-wide text-warning">Override History</span></div>
              <div className="p-4 text-xs space-y-2">
                {t.override_history.map((o, i) => <div key={i}><p><span className="font-mono">{o.from} → {o.to}</span></p><p className="text-muted-foreground">{o.reason} · {o.by}</p></div>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const Meta = ({ l, v, tone }) => (
  <div className="bg-card border border-border rounded-sm p-3">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</div>
    <div className={cn("text-sm font-medium mt-0.5 truncate", tone === "danger" && "text-danger")}>{v || "—"}</div>
  </div>
);
const Card = ({ title, children }) => (
  <div className="bg-card border border-border rounded-sm">
    <div className="px-4 h-[34px] flex items-center border-b border-border"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span></div>
    <div className="p-4">{children}</div>
  </div>
);
const Row = ({ l, v }) => v ? <div className="flex gap-2"><span className="text-muted-foreground w-24 shrink-0 text-xs">{l}</span><span className="text-sm">{v}</span></div> : null;

function DepCol({ title, items, tone, icon: Icon }) {
  return (
    <div className="bg-card border border-border rounded-sm">
      <div className="px-3 h-9 flex items-center gap-1.5 border-b border-border"><Icon className={cn("h-3.5 w-3.5", tone === "danger" ? "text-danger" : "text-muted-foreground")} /><span className="text-xs font-semibold">{title}</span></div>
      <div className="p-3 space-y-1.5">
        {(!items || items.length === 0) && <span className="text-xs text-muted-foreground">None</span>}
        {items?.map((code) => (
          <div key={code} className={cn("flex items-center gap-2 text-sm rounded-sm px-2 py-1", tone === "danger" ? "bg-danger/5" : "bg-surface-sunken")}>
            {tone === "danger" && <span className="text-danger text-xs">Waiting on</span>}
            <span className="font-mono text-xs text-primary">{code}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Comments({ task, isClient, onDone }) {
  const [text, setText] = useState("");
  const [cv, setCv] = useState(false);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await api.addComment(task.id, { text, client_visible: cv }); setText(""); setCv(false); onDone(); toast.success("Comment added"); }
    catch (e) { toast.error(apiErr(e)); } finally { setBusy(false); }
  };
  return (
    <Card title={isClient ? "Discussion" : "Comments"}>
      <div className="space-y-3 mb-4">
        {task.comments?.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        {task.comments?.map((c) => (
          <div key={c.id} className="flex gap-2.5" data-testid={`comment-${c.id}`}>
            <Avatar name={c.author_name} size={28} />
            <div className="flex-1">
              <div className="flex items-center gap-2"><span className="text-sm font-medium">{c.author_name}</span>
                {c.client_visible && <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">Client-visible</span>}
                <span className="text-[11px] text-muted-foreground">{timeAgo(c.created_at)}</span></div>
              <p className="text-sm text-foreground/90 mt-0.5">{c.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-3 space-y-2">
        <Textarea data-testid="comment-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment…" className="rounded-sm min-h-[64px]" />
        <div className="flex items-center justify-between">
          {!isClient && <label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={cv} onCheckedChange={setCv} data-testid="comment-client-visible" />Client-visible</label>}
          <Button data-testid="comment-send" size="sm" className="h-8 rounded-sm gap-1.5 ml-auto" disabled={busy} onClick={send}><Send className="h-3.5 w-3.5" />Post</Button>
        </div>
      </div>
    </Card>
  );
}

function ClientPanel({ task, onDone }) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [showReq, setShowReq] = useState(false);
  const canReview = task.client_visible && ["Ready for Delivery", "Delivered"].includes(task.status);
  const act = async (action, body = {}) => {
    setBusy(true);
    try { await api.clientAction(task.id, { action, ...body }); toast.success(action === "client_approve" ? "Deliverable approved" : "Change request submitted"); setReason(""); setShowReq(false); onDone(); }
    catch (e) { toast.error(apiErr(e)); } finally { setBusy(false); }
  };
  return (
    <div className="bg-card border border-border rounded-sm" data-testid="client-approval-panel">
      <div className="px-4 h-[34px] flex items-center justify-between border-b border-border"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client Review</span><StatusPill status={task.status} /></div>
      <div className="p-4 space-y-3">
        {!canReview ? (
          <p className="text-sm text-muted-foreground">This deliverable is in progress. You'll be able to review it once it's ready for delivery.</p>
        ) : !showReq ? (
          <>
            <p className="text-sm text-muted-foreground">Review the deliverable and approve, or request changes.</p>
            <Button data-testid="client-approve" className="w-full h-9 rounded-sm bg-success text-white hover:bg-success/90 gap-2" disabled={busy} onClick={() => act("client_approve")}><CheckCircle2 className="h-4 w-4" />Approve Deliverable</Button>
            <Button data-testid="client-request-changes" variant="outline" className="w-full h-9 rounded-sm gap-2 text-danger border-danger/40 hover:bg-danger/5" onClick={() => setShowReq(true)}><XCircle className="h-4 w-4" />Request Changes</Button>
          </>
        ) : (
          <>
            <Textarea data-testid="client-changes-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the changes you need…" className="rounded-sm min-h-[80px]" />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-8 rounded-sm" onClick={() => setShowReq(false)}>Cancel</Button>
              <Button data-testid="client-changes-submit" className="flex-1 h-8 rounded-sm bg-danger text-white hover:bg-danger/90" disabled={busy || !reason.trim()} onClick={() => act("client_request_changes", { reason })}>Submit</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
