export default function ScanPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Scan QR</h1>
      <p className="text-muted-foreground">
        Point your camera at a worker's QR badge to open their tipping profile.
      </p>
      <div className="mt-6 rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Scanner coming soon. For now, enter or open a tipping link like <span className="font-mono">/t/&lt;worker-slug&gt;</span>.
        </p>
      </div>
    </div>
  );
}