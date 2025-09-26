"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

interface RestaurantPayload {
  name: string;
  upiId: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface Restaurant {
  id: number;
  name: string;
  upiId: string;
  createdAt: string;
}

export default function OwnerOnboardingPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [step, setStep] = useState<"restaurant" | "staff" | "done">("restaurant");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [form, setForm] = useState<RestaurantPayload>({ name: "", upiId: "" });

  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState<"server" | "chef" | "host" | "manager">("server");

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace(`/login?redirect=${encodeURIComponent("/onboarding/owner")}`);
      return;
    }
    // Only owners can onboard here
    if (session.user.role && session.user.role !== "owner") {
      router.replace(session.user.role === "worker" ? "/onboarding/worker" : "/");
      return;
    }
  }, [session, isPending, router]);

  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null), []);
  const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  const createRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Failed (${res.status})`);
      }
      const created: Restaurant = await res.json();
      setRestaurant(created);
      setStep("staff");
    } catch (err: any) {
      setError(err?.message || "Failed to create restaurant");
    } finally {
      setCreating(false);
    }
  };

  const addFirstStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          displayName: staffName,
          role: staffRole,
          status: "active",
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Failed (${res.status})`);
      }
      setStep("done");
    } catch (err: any) {
      setError(err?.message || "Failed to add staff");
    } finally {
      setCreating(false);
    }
  };

  if (isPending || !session?.user || session.user.role !== "owner") {
    return <div className="mx-auto max-w-2xl px-4 py-10">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Owner Onboarding</h1>
      <p className="text-sm text-muted-foreground mt-1">Create your restaurant and add your first staff member.</p>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">{error}</div>
      )}

      {step === "restaurant" && (
        <form onSubmit={createRestaurant} className="mt-6 space-y-4 rounded-xl border bg-card p-5">
          <div className="space-y-2">
            <label className="text-sm" htmlFor="name">Restaurant name</label>
            <input id="name" className="w-full px-3 py-2 border rounded-md bg-background" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm" htmlFor="upi">UPI VPA (collect)</label>
            <input id="upi" className="w-full px-3 py-2 border rounded-md bg-background" required value={form.upiId} onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))} placeholder="restaurant@bank" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm" htmlFor="city">City</label>
              <input id="city" className="w-full px-3 py-2 border rounded-md bg-background" value={form.city || ""} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm" htmlFor="state">State</label>
              <input id="state" className="w-full px-3 py-2 border rounded-md bg-background" value={form.state || ""} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
            </div>
          </div>
          <button type="submit" disabled={creating} className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-accent">
            {creating ? "Creating…" : "Create restaurant"}
          </button>
        </form>
      )}

      {step === "staff" && restaurant && (
        <form onSubmit={addFirstStaff} className="mt-6 space-y-4 rounded-xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">Restaurant created: <span className="font-medium text-foreground">{restaurant.name}</span></div>
          <div className="space-y-2">
            <label className="text-sm" htmlFor="sname">First staff display name</label>
            <input id="sname" className="w-full px-3 py-2 border rounded-md bg-background" required value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="e.g. Priya" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Role</label>
            <div className="grid grid-cols-4 gap-2">
              {["server", "chef", "host", "manager"].map((r) => (
                <button key={r} type="button" onClick={() => setStaffRole(r as any)} className={`h-9 rounded-md border px-3 text-sm ${staffRole === r ? "bg-foreground text-background" : "hover:bg-accent"}`}>{r}</button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={creating} className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-accent">
            {creating ? "Adding…" : "Add staff"}
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="mt-6 rounded-xl border bg-card p-5">
          <p className="text-sm">You're all set! You can start managing your team.</p>
          <div className="mt-4 flex items-center gap-2">
            <button onClick={() => router.push("/dashboard/owner")} className="inline-flex h-10 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background hover:opacity-90">Go to Owner Dashboard</button>
            <button onClick={() => router.push("/profile")} className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-accent">Profile</button>
          </div>
        </div>
      )}
    </div>
  );
}