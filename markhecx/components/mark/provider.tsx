"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AppState, emptyState } from "@/lib/mark/store";
import { api, APIError, SessionUser, setCSRF, dataChanged } from "@/lib/mark/api/client";
import { useRouter } from "next/navigation";
import { Button, Input, Brand, Badge, Choice } from "./ui";
type Context = { state: AppState; ready: boolean; user: SessionUser | null; update: (fn: (s: AppState) => AppState) => Promise<boolean>; openAuth: (mode?: string) => void; logout: () => Promise<void>; toggleSave: (id: string) => Promise<void>; log: (text: string) => void };
const Ctx = createContext<Context | null>(null);
export function useApp() { const ctx = useContext(Ctx); if (!ctx) throw Error("AppProvider required"); return ctx; }
type Workspace = { state: AppState; revision: number };
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState), [ready, setReady] = useState(false), [user, setUser] = useState<SessionUser | null>(null), [error, setError] = useState("");
  const live = useRef(emptyState), revision = useRef(0), generation = useRef(0), queue = useRef<Promise<unknown>>(Promise.resolve());
  const router = useRouter();
  const [role, setRole] = useState<"Creator" | "Brand">("Creator"), [auth, setAuth] = useState(""), [name, setName] = useState(""), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [busy, setBusy] = useState(false);
  const assign = useCallback((next: AppState) => { live.current = next; setState(next); }, []);
  const clear = useCallback(() => { generation.current++; setCSRF(""); setUser(null); assign(structuredClone(emptyState)); dataChanged(); }, [assign]);
  const load = useCallback(async (session?: { user: SessionUser; csrfToken: string }) => {
    const current = ++generation.current;
    setReady(false); setError("");
    try {
      const s = session || await api<{ user: SessionUser; csrfToken: string }>("/auth/me", { quiet: true });
      if (current !== generation.current) return;
      setCSRF(s.csrfToken);
      const [w, saved] = await Promise.all([api<Workspace>("/workspace"), api<{ ids: string[] }>("/saved-creators")]);
      if (current !== generation.current) return;
      revision.current = w.revision; setUser(s.user);
      assign({ ...w.state, signedIn: true, accountType: s.user.role, saved: s.user.role === "Creator" ? saved.ids : [], brandSaved: s.user.role === "Brand" ? saved.ids : [] });
      dataChanged();
    } catch (e) { if (current !== generation.current) return; clear(); if (!(e instanceof APIError && e.status === 401)) setError(e instanceof Error ? e.message : "Could not load your account."); }
    finally { setReady(true); }
  }, [assign, clear]);
  useEffect(() => { queueMicrotask(() => void load()); const expired = () => { clear(); setReady(true); setAuth("Sign In"); toast.error("Your session expired. Sign in again."); }; window.addEventListener("markhecx:expired", expired); return () => { generation.current++; window.removeEventListener("markhecx:expired", expired); }; }, [load, clear]);
  const update = useCallback((fn: (s: AppState) => AppState): Promise<boolean> => {
    const current = generation.current;
    if (!live.current.signedIn) return Promise.resolve(false);
    let next: AppState;
    try { next = fn(live.current); } catch (e) { toast.error((e as Error).message); return Promise.resolve(false); }
    const previous = live.current;
    assign(next);
    const task = queue.current.then(async () => {
      if (current !== generation.current) return false;
      try {
        const w = await api<Workspace>("/workspace", { method: "PUT", body: { state: next, revision: revision.current } });
        if (current !== generation.current) return false;
        revision.current = w.revision;
        if (live.current === next) assign({ ...w.state, saved: live.current.saved, brandSaved: live.current.brandSaved });
        dataChanged(); return true;
      } catch (e) {
        if (current === generation.current) { generation.current++; assign(previous); }
        toast.error(e instanceof Error ? e.message : "Could not save. Try again."); return false;
      }
    }); queue.current = task; return task;
  }, [assign]);
  const openAuth = useCallback((mode = "Sign In") => { setAuth(mode); setPassword(""); }, []);
  const logout = async () => { try { await api("/auth/logout", { method: "POST" }); clear(); toast.success("Signed out."); router.push("/"); } catch (e) { toast.error((e as Error).message); } };
  const toggleSave = async (id: string) => { if (!live.current.signedIn) return openAuth(); const current = generation.current; try { await api("/marketplace/commands", { method: "POST", body: { type: "creator.save", id } }); const saved = await api<{ ids: string[] }>("/saved-creators"); if (current === generation.current) assign({ ...live.current, [live.current.accountType === "Brand" ? "brandSaved" : "saved"]: saved.ids }); } catch (e) { toast.error((e as Error).message); } };
  const log = () => { /* Domain mutations are persisted by their owning service. */ };
  return <Ctx.Provider value={{ state, ready, user, update, openAuth, logout, toggleSave, log }}>
    {error && <div role="alert" className="info-line">{error} <Button onClick={() => void load()}>Retry connection</Button></div>}
    {children}<Toaster theme="dark" position="top-right" richColors />
    <Dialog open={!!auth} onOpenChange={open => !open && !busy && setAuth("")}><DialogContent className="mark-dialog"><Brand /><Badge tone="purple">Your MarkHECX account</Badge><DialogTitle>{auth === "Sign Up" ? "Make room for your next chapter." : "Welcome to your creative space."}</DialogTitle><DialogDescription>Sign in to access your saved workspace across devices.</DialogDescription>
      <form className="form-grid" onSubmit={async e => { e.preventDefault(); if (busy) return; setBusy(true); try { const session = await api<{ user: SessionUser; csrfToken: string }>(auth === "Sign Up" ? "/auth/register" : "/auth/login", { method: "POST", quiet: true, body: auth === "Sign Up" ? { name, role, email, password } : { email, password } }); await load(session); setPassword(""); setAuth(""); router.push(session.user.role === "Brand" ? "/brand" : "/"); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } }}>
        {auth === "Sign Up" && <><label className="field">Account type<Choice label="Account type" value={role} options={["Creator", "Brand"]} onChange={v => setRole(v as "Creator" | "Brand")} /></label><label className="field">Your display name<Input required maxLength={60} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label></>}
        <label className="field">Email<Input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="field">Password<Input type="password" required minLength={12} maxLength={128} autoComplete={auth === "Sign Up" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} /></label><p className="small-note">Use at least 12 characters.</p>
        <Button className="btn-primary" type="submit" disabled={busy}>{busy ? "Connecting…" : auth}</Button><Button type="button" onClick={() => setAuth(auth === "Sign Up" ? "Sign In" : "Sign Up")}>{auth === "Sign Up" ? "Already have an account? Sign In" : "Create an account"}</Button>
      </form></DialogContent></Dialog>
  </Ctx.Provider>;
}
export function SignInGate({ title = "Your own space to create", description = "Sign in to build your profile and save your workspace." }: { title?: string; description?: string }) { const { openAuth, ready } = useApp(); return <div className="gate"><Brand small /><h1>{title}</h1><p>{ready ? description : "Loading your workspace…"}</p><Button className="btn-primary" onClick={() => openAuth()} disabled={!ready}>Sign In</Button></div>; }
