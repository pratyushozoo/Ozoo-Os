import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiErr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const DEMO = [
  { role: "Super Admin", email: "pratyush@ozoo.me", pw: "OzooAdmin#2026", desc: "Group leadership — all businesses" },
  { role: "Business Admin", email: "aarav@ozoo.me", pw: "ozoo123", desc: "Ozoo OS admin" },
  { role: "Staff", email: "rahul@ozoo.me", pw: "ozoo123", desc: "Executes assigned work" },
  { role: "Client", email: "client@abc.com", pw: "ozoo123", desc: "Client ABC portal" },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e, ov) => {
    e?.preventDefault();
    setBusy(true);
    try {
      await login(ov?.email || email, ov?.pw || pw);
      nav("/");
    } catch (err) {
      toast.error(apiErr(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-slate-950 text-white p-10 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-sm bg-primary text-primary-foreground font-mono font-bold">O</span>
          <span className="text-lg font-semibold tracking-tight">OZOO Space OS</span>
        </div>
        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight">One global task engine.<br />Multiple business contexts.</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            A multi-entity work operating system. Strict workflow guardrails, controlled cross-business visibility, and full accountability from Group down to the exact task owner.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {["Ozoo OS", "Thrive", "Thats Creative", "Group Control"].map((x, i) => (
              <div key={x} className="border border-white/10 rounded-sm px-3 py-2.5 bg-white/5">
                <div className="font-mono text-[10px] text-slate-500 uppercase">Business {i < 3 ? String.fromCharCode(65 + i) : "—"}</div>
                <div className="text-sm font-medium">{x}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-slate-500 text-xs font-mono">
          <ShieldCheck className="h-3.5 w-3.5" /> Nobody is above the system.
        </div>
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      {/* Right auth panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm slide-up">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-sm bg-primary text-primary-foreground font-mono font-bold">O</span>
            <span className="text-lg font-semibold">OZOO Space OS</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Access your OZOO workspace.</p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input data-testid="login-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@ozoo.me" className="h-9 mt-1 rounded-sm" />
            </div>
            <div>
              <Label className="text-xs">Password</Label>
              <Input data-testid="login-password" value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="••••••••" className="h-9 mt-1 rounded-sm" />
            </div>
            <Button data-testid="login-submit" disabled={busy} className="w-full h-9 rounded-sm gap-1.5">Sign in <ArrowRight className="h-4 w-4" /></Button>
          </form>

          <div className="mt-8">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Demo accounts — one-click</div>
            <div className="space-y-1.5">
              {DEMO.map((d) => (
                <button key={d.email} data-testid={`demo-login-${d.role.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={(e) => submit(e, d)} disabled={busy}
                  className={cn("w-full flex items-center justify-between text-left border border-border rounded-sm px-3 py-2 hover:border-primary/50 hover:bg-surface-sunken transition-colors duration-150")}>
                  <div>
                    <div className="text-sm font-medium">{d.role}</div>
                    <div className="text-[11px] text-muted-foreground">{d.desc}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
