"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient, useSession } from "@/lib/auth-client";
import { Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"owner" | "worker">(
    (params.get("role") as any) === "worker" ? "worker" : "owner"
  );

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
        // Fallback to user-chosen role if session role is missing
        router.push(selectedRole === "owner" ? "/dashboard/owner" : "/dashboard/worker");
      }
    }
  }, [session, isPending, router, params, selectedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // remove min length enforcement on login – only validate server-side
    setLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
        rememberMe,
      });
      if (signInError?.code) {
        const map: Record<string, string> = {
          USER_NOT_FOUND: "User not found. Please check your email.",
          INVALID_CREDENTIALS: "Password is incorrect.",
          INVALID_EMAIL_OR_PASSWORD: "Invalid email or password.",
        };
        setError(map[signInError.code] || "Invalid email or password. Please try again.");
        return;
      }
      // Immediately fetch session using freshly set bearer token, then redirect
      const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") || "" : "";
      const res = await authClient.getSession({
        fetchOptions: { auth: token ? { type: "Bearer", token } : undefined },
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
        else router.push(selectedRole === "owner" ? "/dashboard/owner" : "/dashboard/worker");
        return;
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

      {/* Role selection hint for redirect */}
      <div className="mb-4">
        <label className="text-sm">I am a</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSelectedRole("worker")}
            className={`h-9 rounded-md border px-3 text-sm ${selectedRole === "worker" ? "bg-foreground text-background" : "hover:bg-accent"}`}
          >
            Worker
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole("owner")}
            className={`h-9 rounded-md border px-3 text-sm ${selectedRole === "owner" ? "bg-foreground text-background" : "hover:bg-accent"}`}
          >
            Owner
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm" htmlFor="password">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="off"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border rounded-md bg-background"
              placeholder="••••••••"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-2 my-auto h-8 w-8 grid place-items-center text-muted-foreground hover:text-foreground"
              tabIndex={0}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
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
        {error && <div className="text-sm text-destructive" aria-live="polite">{error}</div>}
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