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
  const [allTips, setAllTips] = useState<TipsSummaryResponse["data"]>([]);
  const [recentReviews, setRecentReviews] = useState<QrResolveResponse["recentReviews"]>([]);
  const [resolvedUpi, setResolvedUpi] = useState<string | null>(null);

  // NEW: period + calendar state
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  // NEW: day detail drawer state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false);

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

        // 2) Tips summary + tips list for this staff (fetch a larger page for analytics)
        const tipsRes = await fetch(`/api/staff/${myStaff.id}/tips?page=1&pageSize=1000&order=desc&sort=createdAt`, { headers });
        if (!tipsRes.ok) throw new Error(`Failed to load tips: ${tipsRes.status}`);
        const tipsJson: TipsSummaryResponse = await tipsRes.json();
        setTipsSummary(tipsJson.summary);
        setAllTips(tipsJson.data || []);
        setRecentTips((tipsJson.data || []).slice(0, 5));

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

  // ------- Analytics helpers -------
  const periodFilteredTips = useMemo(() => {
    if (!allTips?.length) return [] as TipsSummaryResponse["data"]; 
    const d = new Date(anchorDate);
    const start = new Date(d);
    const end = new Date(d);
    if (period === "week") {
      const day = d.getDay(); // 0-6
      start.setDate(d.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 7);
      end.setHours(0, 0, 0, 0);
    } else if (period === "month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1, 1);
      end.setHours(0, 0, 0, 0);
    } else {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(start.getFullYear() + 1, 0, 1);
      end.setHours(0, 0, 0, 0);
    }
    return allTips.filter((t) => {
      const dt = new Date(t.createdAt);
      return dt >= start && dt < end;
    });
  }, [allTips, period, anchorDate]);

  const totals = useMemo(() => {
    const sum = periodFilteredTips.reduce((acc, t) => acc + (t.amountCents || 0), 0);
    return {
      sum,
      display: `₹${(sum / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
      count: periodFilteredTips.length,
    };
  }, [periodFilteredTips]);

  // CSV download for current period
  const downloadCSV = () => {
    const rows = [
      ["Date", "Amount (INR)", "Amount (cents)", "Currency", "Payer", "Message", "Status", "Tip ID"],
      ...periodFilteredTips.map((t) => [
        new Date(t.createdAt).toLocaleString(),
        (t.amountCents / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 }),
        String(t.amountCents),
        t.currency,
        t.payerName ?? "",
        (t.message ?? "").replace(/\n|\r|\t/g, " "),
        t.status,
        String(t.id),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tips-${period}-${new Date(anchorDate).toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Month calendar data (uses anchorDate's month)
  const monthCalendar = useMemo(() => {
    const base = new Date(anchorDate);
    const year = base.getFullYear();
    const month = base.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Totals per day
    const dayTotals = new Map<number, number>();
    for (const t of allTips) {
      const dt = new Date(t.createdAt);
      if (dt.getFullYear() === year && dt.getMonth() === month) {
        const day = dt.getDate();
        dayTotals.set(day, (dayTotals.get(day) || 0) + (t.amountCents || 0));
      }
    }

    // Calendar cells
    const startWeekday = firstDay.getDay(); // 0-6
    const daysInMonth = lastDay.getDate();
    const cells: Array<{ day: number | null; amountCents: number } > = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ day: null, amountCents: 0 });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, amountCents: dayTotals.get(d) || 0 });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, amountCents: 0 });

    // For coloring scale
    const max = Math.max(0, ...Array.from(dayTotals.values()));

    return { cells, max, monthLabel: new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(firstDay) };
  }, [allTips, anchorDate]);

  const formatINR = (cents: number) => `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  // Fast helpers for monthly/yearly totals
  const monthTotal = useMemo(() => monthCalendar.cells.reduce((acc, c) => acc + (c.amountCents || 0), 0), [monthCalendar]);
  const yearTotal = useMemo(() => {
    const y = anchorDate.getFullYear();
    return allTips.reduce((acc, t) => {
      const dt = new Date(t.createdAt);
      return acc + (dt.getFullYear() === y ? (t.amountCents || 0) : 0);
    }, 0);
  }, [allTips, anchorDate]);

  // Selected day tips
  const selectedDayTips = useMemo(() => {
    if (!selectedDate) return [] as TipsSummaryResponse["data"]; 
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();
    const d = selectedDate.getDate();
    return allTips.filter((t) => {
      const dt = new Date(t.createdAt);
      return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
    });
  }, [selectedDate, allTips]);
  const selectedDayTotal = useMemo(() => selectedDayTips.reduce((a, t) => a + (t.amountCents || 0), 0), [selectedDayTips]);

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

      {/* Period filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="text-sm text-muted-foreground">View:</div>
        {(["week", "month", "year"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`h-9 rounded-md border px-3 text-sm ${period === p ? "bg-foreground text-background" : "hover:bg-accent"}`}
          >
            {p[0].toUpperCase() + p.slice(1)}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-sm">
          <button
            className="h-9 rounded-md border px-3 hover:bg-accent"
            onClick={() => {
              const d = new Date(anchorDate);
              if (period === "year") d.setFullYear(d.getFullYear() - 1);
              else d.setMonth(d.getMonth() - 1);
              setAnchorDate(d);
            }}
          >
            Prev
          </button>
          <div className="px-2 text-muted-foreground whitespace-nowrap">
            {period === "year"
              ? new Intl.DateTimeFormat("en", { year: "numeric" }).format(anchorDate)
              : new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(anchorDate)}
          </div>
          <button
            className="h-9 rounded-md border px-3 hover:bg-accent"
            onClick={() => {
              const d = new Date(anchorDate);
              if (period === "year") d.setFullYear(d.getFullYear() + 1);
              else d.setMonth(d.getMonth() + 1);
              setAnchorDate(d);
            }}
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
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

        {/* Earnings (selected period) */}
        <div className="rounded-xl border p-5 bg-card shadow-sm">
          <h3 className="font-semibold">Earnings ({period})</h3>
          <p className="text-sm text-muted-foreground">For the selected period</p>
          <div className="mt-3">
            {loading ? (
              <div className="h-7 w-24 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-semibold">{totals.display}</div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {totals.count} tips
            </p>
          </div>
        </div>

        {/* Totals quick view */}
        <div className="rounded-xl border p-5 bg-card shadow-sm">
          <h3 className="font-semibold">Totals</h3>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">This month</span>
              <span className="font-medium">{formatINR(monthTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">This year</span>
              <span className="font-medium">{formatINR(yearTotal)}</span>
            </div>
            <div className="pt-2 border-t text-xs text-muted-foreground">All-time: {earningsDisplay}</div>
          </div>
        </div>
      </div>

      {/* Calendar (month view) */}
      <div className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Earnings Calendar</h3>
          <div className="flex items-center gap-3">
            <button onClick={downloadCSV} className="h-8 rounded-md border px-3 text-xs hover:bg-accent">Download CSV</button>
            <div className="text-sm text-muted-foreground">{monthCalendar.monthLabel}</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
            <div key={d} className="text-xs text-muted-foreground text-center py-1">{d}</div>
          ))}
          {monthCalendar.cells.map((c, i) => {
            const intensity = monthCalendar.max > 0 && c.amountCents > 0
              ? Math.min(1, c.amountCents / monthCalendar.max)
              : 0;
            const bg = c.day === null
              ? "bg-transparent border-transparent"
              : intensity === 0
                ? "bg-muted"
                : intensity < 0.33
                  ? "bg-chart-2/40"
                  : intensity < 0.66
                    ? "bg-chart-4/60"
                    : "bg-chart-5/80";
            return (
              <div
                key={i}
                onClick={() => {
                  if (c.day === null) return;
                  const y = anchorDate.getFullYear();
                  const m = anchorDate.getMonth();
                  setSelectedDate(new Date(y, m, c.day));
                  setDayDrawerOpen(true);
                }}
                className={`aspect-square rounded-md border text-[11px] flex items-center justify-center ${c.day !== null ? "cursor-pointer hover:ring-2 hover:ring-ring/50" : ""} ${bg}`}
                title={c.day ? `${c.day}: ${formatINR(c.amountCents)}` : ""}
              >
                {c.day ?? ""}
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">Click a day to see detailed tips.</div>
      </div>

      {/* Day detail drawer */}
      {dayDrawerOpen && selectedDate && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDayDrawerOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:right-4 sm:top-4 sm:w-[380px] sm:rounded-xl sm:border sm:bg-card sm:shadow-xl bg-card border-t rounded-t-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{selectedDate.toLocaleDateString()}</div>
                <div className="text-lg font-semibold">{formatINR(selectedDayTotal)}</div>
              </div>
              <button className="h-8 rounded-md border px-3 text-xs hover:bg-accent" onClick={() => setDayDrawerOpen(false)}>Close</button>
            </div>
            <div className="mt-3 max-h-[50vh] sm:max-h-[70vh] overflow-y-auto">
              {selectedDayTips.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tips for this day.</p>
              ) : (
                <ul className="divide-y">
                  {selectedDayTips.map((t) => (
                    <li key={t.id} className="py-2 text-sm flex items-center justify-between">
                      <span className="text-muted-foreground">{new Date(t.createdAt).toLocaleTimeString()}</span>
                      <span className="font-medium">{formatINR(t.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

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