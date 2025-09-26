"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

interface Restaurant {
  id: number;
  name: string;
  upiId: string;
  createdAt: string;
}

interface StaffRow {
  id: number;
  displayName: string;
  role: string;
  status: string;
  restaurantId: number;
  restaurantName?: string;
  createdAt: string;
}

interface TipRow {
  id: number;
  amountCents: number;
  currency: string;
  payerName: string | null;
  message: string | null;
  status: string;
  createdAt: string;
  restaurantId?: number;
  restaurantName?: string;
}

interface TipsListResponse {
  data: TipRow[];
  page: number;
  pageSize: number;
  total: number;
}

interface ReviewsListItem {
  id: number;
  staffMemberId: number;
  rating: number;
  comment: string | null;
  tipId: number | null;
  approved: boolean;
  approvedBy: string | null;
  createdAt: string;
  staff: { displayName: string };
  restaurant: { id: number; name: string };
  tip: { id: number; amountCents: number; currency: string } | null;
}

export const OwnerDashboard = () => {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [recentTips, setRecentTips] = useState<TipRow[]>([]);
  const [pendingReviews, setPendingReviews] = useState<ReviewsListItem[]>([]);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace(`/login?redirect=${encodeURIComponent("/dashboard/owner")}`);
      return;
    }
    if (session.user.role && session.user.role !== "owner") {
      const target = session.user.role === "worker" ? "/dashboard/worker" : "/";
      router.replace(target);
      return;
    }
  }, [session, isPending, router]);

  // Fetch owner data
  useEffect(() => {
    const run = async () => {
      if (!session?.user || session.user.role !== "owner") return;
      setLoading(true);
      setError(null);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        // Restaurants (owner-scoped on backend)
        const restRes = await fetch(`/api/restaurants?page=1&pageSize=50&order=desc`, { headers });
        if (!restRes.ok) throw new Error(`Failed to load restaurants: ${restRes.status}`);
        const restJson = await restRes.json();
        setRestaurants(restJson.data || []);

        // Staff (owner-scoped)
        const staffRes = await fetch(`/api/staff?page=1&pageSize=50&order=desc`, { headers });
        if (!staffRes.ok) throw new Error(`Failed to load staff: ${staffRes.status}`);
        const staffJson = await staffRes.json();
        setStaff(staffJson.data || []);

        // Recent tips (owner-scoped)
        const tipsRes = await fetch(`/api/tips?page=1&pageSize=5&order=desc&sort=createdAt`, { headers });
        if (!tipsRes.ok) throw new Error(`Failed to load tips: ${tipsRes.status}`);
        const tipsJson: TipsListResponse = await tipsRes.json();
        setRecentTips(tipsJson.data || []);

        // Pending reviews for moderation
        const revRes = await fetch(`/api/reviews?approved=false&page=1&pageSize=5&order=desc`, { headers });
        if (revRes.ok) {
          const revJson: ReviewsListItem[] = await revRes.json();
          setPendingReviews(revJson || []);
        }
      } catch (e: any) {
        setError(e?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [session]);

  const totalStaff = staff.length;
  const totalRestaurants = restaurants.length;
  const totalRecentTipsAmount = useMemo(() => {
    return recentTips.reduce((acc, t) => acc + (t.amountCents || 0), 0);
  }, [recentTips]);

  const totalRecentTipsAmountDisplay = useMemo(() => `₹${(totalRecentTipsAmount / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`, [totalRecentTipsAmount]);

  const handleApprove = async (id: number, approve: boolean) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`/api/reviews/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ approved: approve }),
      });
      if (!res.ok) throw new Error(`Failed to update review: ${res.status}`);
      // Optimistic update
      setPendingReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e?.message || "Failed to update review");
    }
  };

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

  if (!session?.user || session.user.role !== "owner") return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Owner Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Welcome back, {session.user.name || "owner"}. Here are your latest stats.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {/* Restaurants */}
        <div className="rounded-xl border p-5 bg-card shadow-sm">
          <h3 className="font-semibold">Restaurants</h3>
          <p className="text-sm text-muted-foreground">You manage</p>
          <div className="mt-3">
            {loading ? (
              <div className="h-7 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-semibold">{totalRestaurants}</div>
            )}
            <ul className="mt-3 space-y-1 text-sm max-h-36 overflow-auto">
              {restaurants.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between">
                  <span className="truncate mr-2" title={r.name}>{r.name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Staff */}
        <div className="rounded-xl border p-5 bg-card shadow-sm">
          <h3 className="font-semibold">Staff</h3>
          <p className="text-sm text-muted-foreground">Across your restaurants</p>
          <div className="mt-3">
            {loading ? (
              <div className="h-7 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-semibold">{totalStaff}</div>
            )}
            <ul className="mt-3 space-y-1 text-sm max-h-36 overflow-auto">
              {staff.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span className="truncate mr-2" title={s.displayName}>{s.displayName}</span>
                  <span className="text-xs text-muted-foreground">{s.role}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recent Tips */}
        <div className="rounded-xl border p-5 bg-card shadow-sm">
          <h3 className="font-semibold">Recent Tips</h3>
          <p className="text-sm text-muted-foreground">Last 5 tips across restaurants</p>
          <div className="mt-3">
            {loading ? (
              <div className="h-7 w-24 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-semibold">{totalRecentTipsAmountDisplay}</div>
            )}
            <ul className="mt-3 space-y-1 text-sm max-h-36 overflow-auto">
              {recentTips.map((t) => (
                <li key={t.id} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</span>
                  <span className="font-medium">₹{(t.amountCents / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Pending Reviews Moderation */}
      <div className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Pending Reviews</h3>
        </div>
        <div className="mt-3">
          {loading ? (
            <div className="grid gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : pendingReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews awaiting moderation.</p>
          ) : (
            <ul className="divide-y">
              {pendingReviews.map((r) => (
                <li key={r.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{r.staff.displayName} • {r.restaurant.name}</div>
                    <div className="text-xs text-muted-foreground">Rating: {r.rating}/5</div>
                    {r.comment && (
                      <p className="text-sm mt-1 line-clamp-2">{r.comment}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleApprove(r.id, true)} className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-background text-xs hover:opacity-90">Approve</button>
                    <button onClick={() => handleApprove(r.id, false)} className="inline-flex h-8 items-center rounded-md border px-3 text-xs hover:bg-accent">Reject</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;