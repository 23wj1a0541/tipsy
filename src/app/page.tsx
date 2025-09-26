import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-4 py-16">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <span className="font-medium tracking-wide">TIPSY</span>
          <span className="hidden sm:inline">— Bridging appreciation in the digital age</span>
        </div>

        {/* Hero */}
        <section className="mt-6 space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight">
            Digital tipping that
            <br className="hidden sm:block" /> empowers service workers
            <br className="hidden sm:block" /> and delights customers
          </h1>
          <p className="max-w-3xl text-muted-foreground text-base sm:text-lg">
            Personalized QR badges, instant UPI tips, intelligent reviews, and actionable analytics for restaurants. Built to scale like a startup, designed to feel human.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/login?role=worker"
              className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
            >
              I serve customers (Worker)
            </Link>
            <Link
              href="/login?role=owner"
              className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
            >
              I run a restaurant (Owner)
            </Link>
          </div>
        </section>

        {/* Feature highlights */}
        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Direct digital tips",
              desc: "Seamless UPI-powered tipping via unique QR codes for each worker. No middlemen, no friction.",
            },
            {
              title: "Smart reviews",
              desc: "Encourage quality service with fair, filterable reviews and moderation controls.",
            },
            {
              title: "Actionable analytics",
              desc: "Real-time insights for owners and workers—earnings, ratings, conversion and more.",
            },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border p-5 shadow-sm bg-card">
              <h3 className="font-semibold mb-1">{c.title}</h3>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </section>

        {/* For segments */}
        <section className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border p-6 shadow-sm bg-card">
            <h3 className="text-lg font-semibold mb-1">For Service Workers</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Own your earnings with a personal tipping profile, live notifications, and a beautiful QR badge.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/login?role=worker" className="inline-flex h-9 items-center rounded-md bg-foreground px-3 text-background text-sm">
                Worker Login
              </Link>
              <Link href="/login?role=worker" className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-accent">
                View Dashboard
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border p-6 shadow-sm bg-card">
            <h3 className="text-lg font-semibold mb-1">For Restaurant Owners</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Manage staff, track performance, moderate reviews, and grow your brand reputation.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/login?role=owner" className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-accent">
                Owner Login
              </Link>
              <Link href="/login?role=owner" className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-accent">
                View Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-sm">
          <p className="text-muted-foreground">© 2025 TIPSY. All rights reserved.</p>
          <nav className="flex items-center gap-4">
            <Link href="/scan" className="hover:underline">Scan QR</Link>
            <Link href="/profile" className="hover:underline">Profile</Link>
            <Link href="/admin" className="hover:underline">Admin</Link>
            <Link href="/onboarding/worker" className="hover:underline">Worker Onboarding</Link>
            <Link href="/onboarding/owner" className="hover:underline">Owner Onboarding</Link>
            <Link href="/login" className="hover:underline">Login</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}