"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
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

  const minLen = 8;
  const { score, label, colorClass, widthClass, suggestions } = useMemo(() => {
    const len = password.length;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNum = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    let s = 0;
    if (len >= minLen) s++;
    if (hasLower && hasUpper) s++;
    if (hasNum) s++;
    if (hasSpecial) s++;
    let lbl = "Weak";
    let color = "bg-red-500";
    if (s >= 3) {
      lbl = "Normal";
      color = "bg-yellow-500";
    }
    if (s >= 4) {
      lbl = "Strong";
      color = "bg-green-600";
    }
    const width = s <= 1 ? "w-1/3" : s === 2 || s === 3 ? "w-2/3" : "w-full";
    const sugg: string[] = [];
    if (len < minLen) sugg.push(`Use at least ${minLen} characters`);
    if (!hasNum) sugg.push("Add a number");
    if (!hasSpecial) sugg.push("Add a special character like !@#$");
    if (!(hasLower && hasUpper)) sugg.push("Mix UPPER and lower case letters");
    return { score: s, label: lbl, colorClass: color, widthClass: width, suggestions: sugg };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < minLen) {
      setError(`Password must be at least ${minLen} characters.`);
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
        rememberMe,
        // omit callbackURL; useEffect will route based on role or redirect param
      });
      if (signInError?.code) {
        const map: Record<string, string> = {
          USER_NOT_FOUND: "User not found. Please check your email.",
          INVALID_CREDENTIALS: "Password is wrong. Please try again.",
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
        else router.push("/");
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
              minLength={minLen}
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
          <p className="text-xs text-muted-foreground">Minimum {minLen} characters.</p>
          <div className="h-2 w-full rounded bg-muted overflow-hidden">
            <div className={`h-full ${colorClass} ${widthClass} transition-all`}></div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Strength: <span className={colorClass.replace("bg-", "text-")}>{label}</span></span>
          </div>
          {suggestions.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground list-disc pl-5">
              {suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
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