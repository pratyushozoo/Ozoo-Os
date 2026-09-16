import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { PageHeader, Avatar } from "@/components/common/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sun, Moon, ShieldCheck, GitBranch, LogOut } from "lucide-react";

const ROLE_LABEL = { super_admin: "Super Admin", business_admin: "Business Admin", staff: "Team Member", client: "Client" };
const STATUSES = ["Brief", "In Production", "Internal QA", "Ready for Delivery", "Delivered", "Published"];

export default function Settings() {
  const { user, logout } = useAuth();
  const { businesses, business } = useApp();
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains("dark"));
  const setTheme = (d) => {
    document.documentElement.classList.toggle("dark", d);
    localStorage.setItem("ozoo_theme", d ? "dark" : "light");
    setDark(d);
  };
  const bizName = business === "all" ? "OZOO Group (All Businesses)" : businesses.find((b) => b.id === business)?.name;

  return (
    <div className="fade-in max-w-3xl">
      <PageHeader title="Settings" subtitle="Your profile, appearance and workspace preferences." testid="settings-page" />

      <Card title="Profile">
        <div className="flex items-center gap-4">
          <Avatar src={user.avatar} name={user.name} size={56} />
          <div className="flex-1">
            <div className="text-base font-semibold">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
          <span className="text-xs px-2 py-1 rounded-sm border border-primary/20 bg-primary/10 text-primary font-medium">{ROLE_LABEL[user.role]}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Field l="Role" v={ROLE_LABEL[user.role]} />
          <Field l="Current workspace" v={bizName} />
        </div>
      </Card>

      <Card title="Appearance">
        <div className="grid grid-cols-2 gap-3">
          <ThemeCard active={!dark} onClick={() => setTheme(false)} icon={Sun} label="Light" desc="Default OZOO theme" />
          <ThemeCard active={dark} onClick={() => setTheme(true)} icon={Moon} label="Dark" desc="Low-light workspace" />
        </div>
      </Card>

      {user.role === "super_admin" && (
        <Card title="Workflow Guardrails">
          <p className="text-sm text-muted-foreground mb-3">The OZOO delivery lifecycle is enforced globally. Only the exact permitted next action is available to each role — nobody is above the system.</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUSES.map((s, i) => (
              <React.Fragment key={s}>
                <span className="text-xs px-2 py-1 rounded-sm bg-surface-sunken border border-border">{s}</span>
                {i < STATUSES.length - 1 && <GitBranch className="h-3 w-3 text-muted-foreground rotate-90" />}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Overrides are always recorded in the Audit Log.</div>
        </Card>
      )}

      <Card title="Session">
        <Button data-testid="settings-logout" variant="outline" className="h-9 rounded-sm gap-2 text-danger border-danger/30 hover:bg-danger/5" onClick={logout}>
          <LogOut className="h-4 w-4" />Sign out
        </Button>
      </Card>
    </div>
  );
}

const Card = ({ title, children }) => (
  <div className="bg-card border border-border rounded-sm mb-4">
    <div className="px-4 h-[34px] flex items-center border-b border-border"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span></div>
    <div className="p-4">{children}</div>
  </div>
);
const Field = ({ l, v }) => (
  <div className="bg-surface-sunken rounded-sm p-3"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</div><div className="text-sm font-medium mt-0.5">{v}</div></div>
);
const ThemeCard = ({ active, onClick, icon: Icon, label, desc }) => (
  <button onClick={onClick} data-testid={`theme-${label.toLowerCase()}`} className={cn("flex items-center gap-3 border rounded-sm p-3 text-left transition-colors duration-150", active ? "border-primary bg-primary/5" : "border-border hover:bg-surface-sunken")}>
    <span className={cn("inline-flex items-center justify-center h-9 w-9 rounded-sm", active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}><Icon className="h-4 w-4" /></span>
    <div><div className="text-sm font-medium">{label}</div><div className="text-xs text-muted-foreground">{desc}</div></div>
  </button>
);
