import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toolbar({ children, className }) {
  return <div className={cn("flex items-center gap-2 flex-wrap mb-4", className)}>{children}</div>;
}

export function SearchInput({ value, onChange, placeholder = "Search…", testid }) {
  return (
    <div className="relative w-56">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-8 pl-8 rounded-sm text-sm" />
    </div>
  );
}

export function FilterSelect({ label, value, onChange, items, allLabel = "All", testid, width = "w-40" }) {
  return (
    <Select value={value || "__all"} onValueChange={(v) => onChange(v === "__all" ? "" : v)}>
      <SelectTrigger data-testid={testid} className={cn("h-8 rounded-sm text-sm", width)}>
        <SelectValue placeholder={label}>{value ? items.find((i) => i.value === value)?.label : label}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value="__all">{allLabel}</SelectItem>
        {items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function ViewToggle({ value, onChange, options, testid }) {
  return (
    <div className="inline-flex border border-border rounded-sm overflow-hidden" data-testid={testid}>
      {options.map((o) => (
        <button key={o.value} data-testid={`view-${o.value}`} onClick={() => onChange(o.value)}
          className={cn("h-8 px-3 text-xs font-medium inline-flex items-center gap-1.5 transition-colors duration-150",
            value === o.value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-surface-sunken")}>
          {o.icon && <o.icon className="h-3.5 w-3.5" />}{o.label}
        </button>
      ))}
    </div>
  );
}
