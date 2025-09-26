"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export default function WorkerOnboardingPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [saving, setSaving] = useState(false);

  // Guards
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace(`/login?redirect=${encodeURIComponent("/onboarding/worker")}`);
      return;
    }
    // If owner, send to owner onboarding
    if (session.user.role && session.user.role !== "worker") {
      router.replace(session.user.role === "owner" ? "/onboarding/owner" : "/");
      return;
    }
  }, [session, isPending, router]);

  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null), []);
  const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch worker's staff record
  useEffect(() => {
    const run = async () => {
      if (!session?.user || session.user.role !== "worker") return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/staff?page=1&pageSize=1`, { headers: authHeaders });
        if (!res.ok) throw new Error(`Failed to load your staff profile (${res.status})`);
        const j = await res.json();
        const record: StaffRecord | undefined = j?.data?.[0];
        if (!record) throw new Error("No staff profile found. Ask your owner to add you to a restaurant.");
        setStaff(record);
        setDisplayName(record.displayName || "");
        setUpiId(record.upiId || "");
      } catch (e: any) {
        setError(e?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [session]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ displayName, upiId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Failed to save (${res.status})`);
      }
      const updated = await res.json();
      setStaff((prev) => (prev ? { ...prev, displayName: updated.displayName, upiId: updated.upiId } : prev));
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Badge rendering
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrUrl = staff?.qrKey ? `${typeof window !== "undefined" ? window.location.origin : ""}/t/${encodeURIComponent(staff.qrKey)}` : "";
  const externalQrImg = staff?.qrKey
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`
    : "";

  const drawBadge = async () => {
    if (!canvasRef.current || !staff) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 720;
    const height = 1024;
    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Header band
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, width, 120);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px sans-serif";
    ctx.fillText("TIPSY • Worker Badge", 24, 70);

    // Name
    ctx.fillStyle = "#111111";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText(staff.displayName || "—", 24, 200);

    // Role + Restaurant
    ctx.fillStyle = "#444444";
    ctx.font = "28px sans-serif";
    ctx.fillText(`${staff.role}${staff.restaurantName ? " • " + staff.restaurantName : ""}`, 24, 250);

    // UPI
    ctx.font = "26px sans-serif";
    ctx.fillText(`UPI: ${staff.upiId || "—"}`, 24, 295);

    // QR
    if (externalQrImg) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.drawImage(img, (width - 420) / 2, 340, 420, 420);
          resolve();
        };
        img.src = externalQrImg;
      });
    }

    // Footer
    ctx.fillStyle = "#444444";
    ctx.font = "24px sans-serif";
    ctx.fillText(qrUrl || "", 24, height - 40);
  };

  const handleDownload = async () => {
    await drawBadge();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(staff?.displayName || "badge").toLowerCase().replace(/\s+/g, "-")}-tipsy.png`;
    a.click();
  };

  if (isPending || !session?.user || session.user.role !== "worker") {
    return <div className="mx-auto max-w-2xl px-4 py-10">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Worker Onboarding</h1>
      <p className="text-sm text-muted-foreground mt-1">Complete your tipping profile and download your QR badge.</p>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">{error}</div>
      )}

      <div className="mt-6 rounded-xl border bg-card p-5 space-y-5">
        {loading ? (
          <div className="space-y-3">
            <div className="h-10 w-1/2 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
        ) : !staff ? (
          <div className="text-sm text-muted-foreground">
            No staff record found for your account. Please ask your restaurant owner to add you to their team.
          </div>
        ) : (
          <>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm" htmlFor="name">Display name</label>
                <input
                  id="name"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="e.g. Priya"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm" htmlFor="upi">Your UPI VPA</label>
                <input
                  id="upi"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="name@bank"
                />
                <p className="text-xs text-muted-foreground">Tips will be sent to this UPI if set; otherwise, the restaurant UPI will be used.</p>
              </div>
              <button type="submit" disabled={saving} className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-accent">
                {saving ? "Saving…" : "Save profile"}
              </button>
            </form>

            <div className="pt-4 border-t" />

            <div>
              <h2 className="font-semibold">Your QR Badge</h2>
              <p className="text-sm text-muted-foreground">Share or print this badge. It links to your tipping page.</p>

              {staff.qrKey ? (
                <div className="mt-3 grid gap-4">
                  <div className="rounded-lg border p-4 flex flex-col items-center">
                    <div className="text-sm mb-2">Preview</div>
                    {/* External QR preview for speed */}
                    <img src={externalQrImg} alt="QR code" className="h-48 w-48" />
                    <div className="mt-2 text-xs text-muted-foreground break-all max-w-full">{qrUrl}</div>
                    <button onClick={handleDownload} className="mt-4 inline-flex h-9 items-center rounded-md bg-foreground px-3 text-background text-sm hover:opacity-90">Download PNG</button>
                  </div>
                  {/* Hidden canvas used to render a higher-res badge */}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              ) : (
                <div className="mt-3 text-sm text-muted-foreground">
                  QR key is not set yet. Ask your owner to add you as staff to generate your QR.
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button onClick={() => router.push("/dashboard/worker")} className="inline-flex h-10 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background hover:opacity-90">Go to Worker Dashboard</button>
              <button onClick={() => router.push("/profile")} className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-accent">Profile</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}