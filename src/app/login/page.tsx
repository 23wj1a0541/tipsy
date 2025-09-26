"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient, useSession } from "@/lib/auth-client";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-10">Loading…</div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, isPending } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPending && session?.user) {
      const redirectParam = params.get("redirect");
      if (redirectParam) {
        router.push(redirectParam);
        return;
      }
      const role = session.user.role as string | undefined;
      if (role === "owner") {
        router.push("/dashboard/owner");
      } else if (role === "worker") {
        router.push("/dashboard/worker");
      } else if (role === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    }
  }, [session, isPending, router, params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        rememberMe,
        // omit callbackURL; useEffect will route based on role or redirect param
      });
      if (error?.code) {
        setError("Invalid email or password. Please try again.");
        return;
      }
      // Immediately fetch session using freshly set bearer token, then redirect
      const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") || "" : "";
      const res = await authClient.getSession({
        fetchOptions: {
          auth: token ? { type: "Bearer", token } : undefined,
        },
      });
      const s = res?.data;
      if (s?.user) {
        const redirectParam = params.get("redirect");
        if (redirectParam) {
          router.push(redirectParam);
          return;
        }
        const role = (s.user as any).role as string | undefined;
        if (role === "owner") router.push("/dashboard/owner");
        else if (role === "worker") router.push("/dashboard/worker");
        else if (role === "admin") router.push("/admin");
        else router.push("/");
      }
      // Fallback: let useEffect handle if session arrives slightly later
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="space-y-1 mb-6 text-center">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">Access your dashboard</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="off"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
            placeholder="••••••••"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>
          <a className="text-sm underline" href="/register">Create account</a>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 rounded-md border hover:bg-accent"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}