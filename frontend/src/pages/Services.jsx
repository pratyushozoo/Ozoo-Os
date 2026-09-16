import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { PageHeader, Loading } from "@/components/common/primitives";
import { Palette, Code2, Sparkles, Search, Share2, FileText, Megaphone, Briefcase, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { "UI/UX Design": Palette, "Web Development": Code2, Branding: Sparkles, SEO: Search, "Social Media": Share2, Content: FileText, Marketing: Megaphone, Consultancy: Briefcase };

export default function Services() {
  const { businessId } = useApp();
  const nav = useNavigate();
  const [services, setServices] = useState(null);
  useEffect(() => { setServices(null); api.services(businessId).then(setServices); }, [businessId]);
  if (!services) return <Loading label="Loading services" />;

  return (
    <div className="fade-in">
      <PageHeader title="Services" subtitle="Reusable service templates delivered across businesses and clients." testid="services-page" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {services.map((s) => {
          const Icon = ICONS[s.name] || Layers;
          return (
            <div key={s.id} data-testid={`service-card-${s.code}`} onClick={() => nav(`/tasks?service=${s.id}`)}
              className="bg-card border border-border rounded-sm p-4 hover:border-primary/40 transition-colors duration-150 cursor-pointer">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-sm bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                <div><div className="font-semibold text-sm">{s.name}</div><div className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.category}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <M n={s.active_projects} l="Projects" />
                <M n={s.active_tasks} l="Active" />
                <M n={s.delivered} l="Delivered" />
                <M n={s.overdue_tasks} l="Overdue" tone={s.overdue_tasks ? "danger" : ""} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
const M = ({ n, l, tone }) => <div className="bg-surface-sunken rounded-sm py-1.5"><div className={cn("text-base font-semibold tabular-nums", tone === "danger" && "text-danger")}>{n}</div><div className="text-[10px] text-muted-foreground uppercase tracking-wide">{l}</div></div>;
