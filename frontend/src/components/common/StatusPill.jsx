import React from "react";
import { cn } from "@/lib/utils";

export const STATUS_STYLES = {
  Brief: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  "In Production": "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/25",
  "Internal QA": "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
  "Ready for Delivery": "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/25",
  Delivered: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/25",
  Published: "bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/25",
  Blocked: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/25",
  Rework: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/25",
};

export const STATUS_DOT = {
  Brief: "bg-blue-500", "In Production": "bg-indigo-500", "Internal QA": "bg-amber-500",
  "Ready for Delivery": "bg-teal-500", Delivered: "bg-green-500", Published: "bg-slate-500",
  Blocked: "bg-red-500", Rework: "bg-pink-500",
};

export function StatusPill({ status, className, dot = true }) {
  return (
    <span
      data-testid={`status-pill-${(status || "").toLowerCase().replace(/\s+/g, "-")}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[status] || "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status] || "bg-muted-foreground")} />}
      {status}
    </span>
  );
}

const PRIO = {
  Critical: "text-red-600 dark:text-red-400",
  High: "text-orange-600 dark:text-orange-400",
  Medium: "text-slate-600 dark:text-slate-300",
  Low: "text-muted-foreground",
};
const PRIO_BAR = { Critical: "bg-red-500", High: "bg-orange-500", Medium: "bg-slate-400", Low: "bg-slate-300" };

export function PriorityPill({ priority }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", PRIO[priority] || "text-muted-foreground")}>
      <span className={cn("h-3 w-0.5 rounded-full", PRIO_BAR[priority] || "bg-muted")} />
      {priority}
    </span>
  );
}
