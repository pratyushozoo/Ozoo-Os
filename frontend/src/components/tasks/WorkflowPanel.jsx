import React, { useState } from "react";
import { api, apiErr } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusPill } from "@/components/common/StatusPill";
import { cn } from "@/lib/utils";
import { ArrowRight, ShieldAlert, Ban, AlertCircle, Lock } from "lucide-react";

const VARIANT_CLASS = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  success: "bg-success text-white hover:bg-success/90",
  danger: "bg-danger text-white hover:bg-danger/90",
  warning: "bg-warning text-white hover:bg-warning/90",
  ghost: "bg-transparent border border-border text-muted-foreground hover:bg-surface-sunken",
};

export function WorkflowPanel({ task, onDone }) {
  const actions = task.available_actions || [];
  const [dialog, setDialog] = useState(null); // {action}
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const run = async (action, body = {}) => {
    setBusy(true);
    try {
      await api.transition(task.id, { action: action.key, ...body });
      toast.success(`${action.label} — ${task.code} updated`);
      setDialog(null); setForm({});
      onDone && onDone();
    } catch (e) {
      toast.error(apiErr(e));
    } finally { setBusy(false); }
  };

  const onClick = (a) => {
    if (a.missing && a.missing.length) return; // blocked; requirements shown below
    if (a.needs_reason || a.needs_destination || a.is_override) { setDialog(a); return; }
    run(a);
  };

  return (
    <div className="bg-card border border-border rounded-sm" data-testid="workflow-panel">
      <div className="px-4 h-[34px] flex items-center justify-between border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workflow</span>
        <StatusPill status={task.status} />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Current stage</span><ArrowRight className="h-3 w-3" />
          <span className="font-medium text-foreground">{task.status}</span>
        </div>

        {actions.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-surface-sunken rounded-sm p-3">
            <Lock className="h-4 w-4" />
            {task.status === "Published" ? "This task is Published. The workflow is complete." : "No workflow actions available for your role at this stage."}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {actions.map((a) => {
            const blocked = a.missing && a.missing.length > 0;
            return (
              <div key={a.key}>
                <button
                  data-testid={`workflow-action-${a.key}`}
                  disabled={busy || blocked}
                  onClick={() => onClick(a)}
                  className={cn(
                    "w-full h-9 rounded-sm text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
                    VARIANT_CLASS[a.variant] || VARIANT_CLASS.primary
                  )}>
                  {a.is_override && <ShieldAlert className="h-4 w-4" />}
                  {a.key === "mark_blocked" && <Ban className="h-4 w-4" />}
                  {a.label}
                  {a.to && a.to !== "*" && !a.is_override && <span className="text-xs opacity-80">→ {a.to}</span>}
                </button>
                {blocked && (
                  <div className="mt-1.5 rounded-sm border border-warning/30 bg-warning/10 p-2" data-testid={`workflow-missing-${a.key}`}>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-warning mb-1">
                      <AlertCircle className="h-3.5 w-3.5" /> Cannot {a.label.toLowerCase()} yet
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-0.5 pl-5 list-disc">
                      {a.missing.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ActionDialog dialog={dialog} form={form} setForm={setForm} busy={busy}
        onClose={() => { setDialog(null); setForm({}); }}
        onConfirm={() => {
          if (dialog.key === "override") return run(dialog, { to_status: form.to_status, reason: form.reason });
          if (dialog.key === "mark_blocked") return run(dialog, { reason: form.reason, description: form.description, dependency: form.dependency, responsible: form.responsible, expected_resolution: form.expected_resolution });
          if (dialog.key === "publish") return run(dialog, { destination: form.destination });
          return run(dialog, { reason: form.reason, description: form.description });
        }} />
    </div>
  );
}

const STATUSES = ["Brief", "In Production", "Internal QA", "Ready for Delivery", "Delivered", "Published", "Rework"];

function ActionDialog({ dialog, form, setForm, busy, onClose, onConfirm }) {
  if (!dialog) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const isBlock = dialog.key === "mark_blocked";
  const isOverride = dialog.key === "override";
  const isPublish = dialog.key === "publish";
  const canConfirm =
    isOverride ? form.to_status && form.reason :
    isBlock ? form.reason :
    dialog.needs_reason ? form.reason : true;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="rounded-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isOverride && <ShieldAlert className="h-4 w-4 text-warning" />}
            {dialog.label}
          </DialogTitle>
          <DialogDescription>
            {isOverride ? "Overrides are audited. Record the reason — nobody is above the system."
              : isBlock ? "Blocking is an exception. Capture the details so it can be resolved."
              : dialog.key === "request_rework" ? "QA feedback is recorded and returned to the owner."
              : "Confirm this workflow transition."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {isOverride && (
            <div>
              <Label className="text-xs">Target status</Label>
              <Select value={form.to_status || ""} onValueChange={set("to_status")}>
                <SelectTrigger data-testid="override-status-select" className="h-8 mt-1 rounded-sm"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {isPublish && (
            <div>
              <Label className="text-xs">Destination / reference</Label>
              <Input data-testid="publish-destination" value={form.destination || ""} onChange={set("destination")} placeholder="e.g. Client Site, App Store" className="h-8 mt-1 rounded-sm" />
            </div>
          )}
          {(dialog.needs_reason || isBlock || isOverride) && (
            <div>
              <Label className="text-xs">{isBlock ? "Reason" : isOverride ? "Override reason" : "Reason / feedback"}</Label>
              {isBlock ? (
                <Select value={form.reason || ""} onValueChange={set("reason")}>
                  <SelectTrigger data-testid="block-reason-select" className="h-8 mt-1 rounded-sm"><SelectValue placeholder="Select a reason" /></SelectTrigger>
                  <SelectContent>
                    {["Waiting for client", "Waiting for asset", "Approval pending", "Technical issue", "Dependency incomplete", "Resource unavailable"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Textarea data-testid="action-reason" value={form.reason || ""} onChange={set("reason")} placeholder="Describe…" className="mt-1 rounded-sm min-h-[70px]" />
              )}
            </div>
          )}
          {isBlock && (
            <>
              <div><Label className="text-xs">Description</Label>
                <Textarea data-testid="block-description" value={form.description || ""} onChange={set("description")} className="mt-1 rounded-sm min-h-[60px]" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Responsible party</Label>
                  <Input value={form.responsible || ""} onChange={set("responsible")} className="h-8 mt-1 rounded-sm" /></div>
                <div><Label className="text-xs">Expected resolution</Label>
                  <Input type="date" value={form.expected_resolution || ""} onChange={set("expected_resolution")} className="h-8 mt-1 rounded-sm" /></div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" className="h-8 rounded-sm" onClick={onClose}>Cancel</Button>
          <Button data-testid="action-confirm" disabled={busy || !canConfirm} className="h-8 rounded-sm" onClick={onConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
