"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, X } from "lucide-react";

const LS_USER_KEY = "admin_username";
const LS_PASS_KEY = "admin_password";
const LS_AUTH_KEY = "adminLocalAuthed";

export const AdminLockButton = () => {
  const router = useRouter();
  const search = useSearchParams();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const uRef = useRef<HTMLInputElement>(null);

  const defaults = useMemo(() => {
    // Fallback defaults
    if (typeof window === "undefined") return { u: "admin", p: "admin" };
    const u = localStorage.getItem(LS_USER_KEY) || "admin";
    const p = localStorage.getItem(LS_PASS_KEY) || "admin";
    return { u, p };
  }, []);

  useEffect(() => {
    // Open dialog when query param present e.g. ?unlock=1
    if (search?.get("unlock")) setOpen(true);
  }, [search]);

  useEffect(() => {
    if (open) {
      setUsername("");
      setPassword("");
      setError(null);
      setTimeout(() => uRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const storeU = localStorage.getItem(LS_USER_KEY) || defaults.u;
    const storeP = localStorage.getItem(LS_PASS_KEY) || defaults.p;
    if (username === storeU && password === storeP) {
      localStorage.setItem(LS_AUTH_KEY, "true");
      setOpen(false);
      router.push("/admin-local");
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <>
      {/* Floating lock button */}
      <button
        aria-label="Open admin login"
        className="fixed bottom-4 right-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border bg-background/80 shadow hover:bg-accent"
        onClick={() => setOpen(true)}
      >
        <Lock className="h-5 w-5" />
      </button>

      {/* Simple modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border bg-card p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Admin Lock</h2>
              <button className="rounded p-1 hover:bg-accent" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Username</label>
                <input
                  ref={uRef}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="admin"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="off"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="pt-1 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">Cancel</button>
                <button type="submit" className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90">Unlock</button>
              </div>
              <p className="text-[11px] text-muted-foreground">Default: admin / admin</p>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminLockButton;