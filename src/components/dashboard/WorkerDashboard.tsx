"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

interface StaffRecord {
  id: number;
  displayName: string;
  role: string;
  status: string;
  qrKey: string;
  upiId: string | null;
  restaurantId: number;
  restaurantName?: string;
}

interface TipsSummaryResponse {
  data: Array<{
    id: number;
    amountCents: number;
    currency: string;
    payerName: string | null;
    message: string | null;
    status: string;
    createdAt: string;
  }>;
  page: number;
  pageSize: number;
  total: number;
  summary: {
    totalAmount: number; // cents
    tipCount: number;
  };
}

interface QrResolveResponse {
  staff: { id: number; displayName: string; role: string };
  restaurant: { id: number; name: string };
  upi_id_resolved: string | null;
  recentReviews: Array<{ rating: number; comment: string | null; created_at: string }>;
  recentTips: Array<{ amount_cents: number; created_at: string }>;
}

export const WorkerDashboard = () => {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [tipsSummary, setTipsSummary] = useState<TipsSummaryResponse["summary"] | null>(null);
  const [recentTips, setRecentTips] = useState<TipsSummaryResponse["data"]>([]);
  const [recentReviews, setRecentReviews] = useState<QrResolveResponse["recentReviews"]>([]);
  const [resolvedUpi, setResolvedUpi] = useState<string | null>(null);

  // Role guard + redirect
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace(`/login?redirect=${encodeURIComponent("/dashboard/worker")}`);
      return;
    }
    if (session.user.role && session.user.role !== "worker") {
      const target = session.user.role === "owner" ? "/dashboard/owner" : "/";
      router.replace(target);
      return;
    }
  }, [session, isPending, router]);

  // Data fetching
  useEffect(() => {
    const run = async () => {
      if (!session?.user || session.user.role !== "worker") return;
      setLoading(true);
      setError(null);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        // 1) Get worker's staff record (API filters by current user for workers)
        const staffRes = await fetch(`/api/staff?page=1&pageSize=1`, { headers });
        if (!staffRes.ok) throw new Error(`Failed to load profile: ${staffRes.status}`);
        const staffJson = await staffRes.json();
        const myStaff: StaffRecord | undefined = staffJson?.data?.[0];
        if (!myStaff) throw new Error("No staff profile found for your account");
        setStaff(myStaff);

        // 2) Tips summary + recent tips for this staff
        const tipsRes = await fetch(`/api/staff/${myStaff.id}/tips?page=1&pageSize=5&order=desc&sort=createdAt`, { headers });
        if (!tipsRes.ok) throw new Error(`Failed to load tips: ${tipsRes.status}`);
        const tipsJson: TipsSummaryResponse = await tipsRes.json();
        setTipsSummary(tipsJson.summary);
        setRecentTips(tipsJson.data || []);

        // 3) Recent reviews + resolved UPI via public QR resolve
        if (myStaff.qrKey) {
          const qrRes = await fetch(`/api/qr-resolve?key=${encodeURIComponent(myStaff.qrKey)}`);
          if (qrRes.ok) {
            const qrJson: QrResolveResponse = await qrRes.json();
            setRecentReviews(qrJson.recentReviews || []);
            setResolvedUpi(qrJson.upi_id_resolved || null);
          }
        }
      } catch (e: any) {
        setError(e?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [session]);

  const earningsDisplay = useMemo(() => {
    if (!tipsSummary) return "₹0";
    const rupees = (tipsSummary.totalAmount || 0) / 100;
    return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }, [tipsSummary]);

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "worker") return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Worker Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Welcome back, {session.user.name || "worker"}. Here are your latest stats.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {/* QR & Identity */}
        <div className="rounded-xl border p-5 bg-card shadow-sm">
          <h3 className="font-semibold">Your QR</h3>
          <p className="text-sm text-muted-foreground">Show this code to receive tips.</p>
          <div className="mt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">QR Key</span>
              <span className="font-medium truncate max-w-[60%]" title={staff?.qrKey || "—"}>{staff?.qrKey || "—"}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">UPI ID</span>
              <span className="font-medium truncate max-w-[60%]" title={resolvedUpi || staff?.upiId || "—"}>{resolvedUpi || staff?.upiId || "—"}</span>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="rounded-xl border p-5 bg-card shadow-sm">
          <h3 className="font-semibold">Earnings</h3>
          <p className="text-sm text-muted-foreground">Recent totals</p>
          <div className="mt-3">
            {loading ? (
              <div className="h-7 w-24 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-semibold">{earningsDisplay}</div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {tipsSummary?.tipCount ?? 0} tips
            </p>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="rounded-xl border p-5 bg-card shadow-sm">
          <h3 className="font-semibold">Recent Reviews</h3>
          <div className="mt-3 space-y-2">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))
            ) : recentReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              recentReviews.slice(0, 5).map((r, i) => (
                <div key={i} className="rounded border px-3 py-2">
                  <div className="text-sm font-medium">Rating: {r.rating}/5</div>
                  {r.comment && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent tips list */}
      <div className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Recent Tips</h3>
          {/* ... keep room for filters later ... */}
        </div>
        <div className="mt-3">
          {loading ? (
            <div className="grid gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : recentTips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tips yet.</p>
          ) : (
            <ul className="divide-y">
              {recentTips.map((t) => (
                <li key={t.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</span>
                  <span className="font-medium">₹{(t.amountCents / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;