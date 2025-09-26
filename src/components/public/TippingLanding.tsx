"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type QrResolveResponse = {
  staff: { id: number; displayName: string; role: string };
  restaurant: { id: number; name: string };
  upi_id_resolved: string | null;
  recentReviews: { rating: number; comment: string | null; created_at: string }[];
  recentTips: { amount_cents: number; created_at: string }[];
};

interface Props {
  qrKey: string;
}

export const TippingLanding = ({ qrKey }: Props) => {
  const [data, setData] = useState<QrResolveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tip form
  const [amount, setAmount] = useState<string>("");

  // Review form
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  // New: quick feedback for copy/share actions
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/qr/${encodeURIComponent(qrKey)}`);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Failed to load: ${res.status}`);
        }
        const j: QrResolveResponse = await res.json();
        if (active) setData(j);
      } catch (e: any) {
        if (active) setError(e?.message || "Something went wrong");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [qrKey]);

  const upiLink = useMemo(() => {
    if (!data?.upi_id_resolved) return null;
    const pa = data.upi_id_resolved; // payee address (VPA)
    const pn = encodeURIComponent(data.staff.displayName || "Staff"); // payee name
    const cu = "INR";
    const am = amount && Number(amount) > 0 ? `&am=${encodeURIComponent(Number(amount).toFixed(2))}` : "";
    const tn = encodeURIComponent(`Tip for ${data.staff.displayName} @ ${data.restaurant.name}`);
    return `upi://pay?pa=${encodeURIComponent(pa)}&pn=${pn}&cu=${cu}${am}&tn=${tn}`;
  }, [data, amount]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setSubmitMsg("Please choose a rating between 1 and 5.");
      return;
    }
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch(`/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffKey: qrKey, rating, comment: comment || undefined }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to submit review");
      setSubmitMsg("Thanks for your review! It has been posted.");
      setComment("");
      // Optimistically prepend review
      setData((prev) =>
        prev
          ? {
              ...prev,
              recentReviews: [
                { rating, comment: comment || null, created_at: new Date().toISOString() },
                ...prev.recentReviews,
              ].slice(0, 5),
            }
          : prev
      );
    } catch (e: any) {
      setSubmitMsg(e?.message || "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  };

  // New: Copy UPI and Share link helpers
  const handleCopyUpi = async () => {
    if (!data?.upi_id_resolved) return;
    try {
      await navigator.clipboard.writeText(data.upi_id_resolved);
      setActionMsg("UPI ID copied");
    } catch {
      setActionMsg("Copy failed");
    } finally {
      setTimeout(() => setActionMsg(null), 1600);
    }
  };

  const handleShareLink = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = data ? `Tip ${data.staff.displayName}` : "Tip";
    const text = data ? `Support ${data.staff.displayName} at ${data.restaurant.name}` : "Support via Tipsy";
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        // @ts-expect-error: share may not exist in older lib DOM typings
        await navigator.share({ title, text, url });
        setActionMsg("Share dialog opened");
      } else {
        await navigator.clipboard.writeText(url);
        setActionMsg("Link copied");
      }
    } catch {
      // User may cancel share; provide gentle feedback only if clipboard fallback also failed.
      setActionMsg("Unable to share");
    } finally {
      setTimeout(() => setActionMsg(null), 1600);
    }
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="h-6 w-40 rounded bg-muted animate-pulse" />
        <div className="h-10 w-full rounded bg-muted animate-pulse" />
        <div className="h-24 w-full rounded bg-muted animate-pulse" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border bg-card p-6">
        <h1 className="text-xl font-semibold mb-2">QR not available</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div className="mt-4">
          <Link href="/" className="text-sm underline">Go back home</Link>
        </div>
      </section>
    );
  }

  if (!data) return null;

  const displayAmount = () => {
    try {
      const n = Number(amount);
      if (!isFinite(n) || n <= 0) return undefined;
      return n.toFixed(2);
    } catch {
      return undefined;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Tipping</div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Tip {data.staff.displayName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {data.restaurant.name}
            </p>
          </div>
          <div className="text-right text-sm">
            <div className="text-muted-foreground">UPI</div>
            <div className="font-mono">{data.upi_id_resolved || "Unavailable"}</div>
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={handleCopyUpi}
                disabled={!data.upi_id_resolved}
                className="inline-flex h-8 items-center justify-center rounded-md border px-2 text-xs hover:bg-accent disabled:opacity-50"
              >
                Copy UPI
              </button>
              <button
                onClick={handleShareLink}
                className="inline-flex h-8 items-center justify-center rounded-md border px-2 text-xs hover:bg-accent"
              >
                Share link
              </button>
            </div>
            {actionMsg && (
              <div className="mt-1 text-[11px] text-muted-foreground">{actionMsg}</div>
            )}
          </div>
        </div>
      </section>

      {/* Tip via UPI */}
      <section className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">Send a tip</h2>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <input
            type="number"
            inputMode="decimal"
            placeholder="Amount (INR)"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
          />
          {upiLink ? (
            <a
              href={upiLink}
              className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
            >
              Open UPI app{displayAmount() ? ` • ₹${displayAmount()}` : ""}
            </a>
          ) : (
            <button
              disabled
              className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm text-muted-foreground"
            >
              UPI unavailable
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Supports apps like GPay, PhonePe, Paytm. You can also send manually
          using the UPI ID above.
        </p>
      </section>

      {/* Recent activity */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-3">Recent tips</h3>
          <ul className="space-y-2 text-sm">
            {data.recentTips.length === 0 && (
              <li className="text-muted-foreground">No tips yet. Be the first!</li>
            )}
            {data.recentTips.map((t, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>₹{(t.amount_cents / 100).toFixed(2)}</span>
                <span className="text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-3">Recent reviews</h3>
          <ul className="space-y-3 text-sm">
            {data.recentReviews.length === 0 && (
              <li className="text-muted-foreground">No reviews yet.</li>
            )}
            {data.recentReviews.map((r, i) => (
              <li key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-yellow-600">
                    {"★".repeat(r.rating)}
                    <span className="text-muted-foreground">({r.rating})</span>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.comment && <p className="text-sm">{r.comment}</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Review form */}
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Leave a review</h2>
        <form onSubmit={handleSubmitReview} className="space-y-3">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                className={`h-8 w-8 rounded-md border text-lg leading-8 ${
                  i <= rating ? "bg-yellow-100 border-yellow-300" : "bg-background"
                }`}
                onClick={() => setRating(i)}
                aria-label={`${i} star${i > 1 ? "s" : ""}`}
              >
                {i <= rating ? "★" : "☆"}
              </button>
            ))}
            <span className="text-sm text-muted-foreground">{rating} / 5</span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share a few words about your experience (optional)"
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            maxLength={500}
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit review"}
            </button>
            {submitMsg && <span className="text-sm text-muted-foreground">{submitMsg}</span>}
          </div>
        </form>
      </section>

      <div className="text-center text-xs text-muted-foreground">
        Powered by Tipsy • <Link href="/" className="underline">Learn more</Link>
      </div>
    </div>
  );
};

export default TippingLanding;