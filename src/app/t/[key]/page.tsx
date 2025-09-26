import { Suspense } from "react";
import { TippingLanding } from "@/components/public/TippingLanding";

interface PageProps {
  params: { key: string };
}

export default function TippingPage({ params }: PageProps) {
  const { key } = params;
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Suspense fallback={<div className="space-y-3"><div className="h-6 w-40 rounded bg-muted animate-pulse" /><div className="h-10 w-full rounded bg-muted animate-pulse" /><div className="h-24 w-full rounded bg-muted animate-pulse" /></div>}>
        <TippingLanding qrKey={key} />
      </Suspense>
    </main>
  );
}