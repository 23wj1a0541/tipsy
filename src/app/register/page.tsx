"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"owner" | "worker">((params.get("role") as any) === "worker" ? "worker" : "owner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const minLen = 8;
  const { label, colorClass, widthClass, suggestions } = useMemo(() => {
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
    return { label: lbl, colorClass: color, widthClass: width, suggestions: sugg };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < minLen) {
      setError(`Password must be at least ${minLen} characters`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await authClient.signUp.email({
        email,
        name,
        password,
      });

      if (error?.code) {
        const errorMap: Record<string, string> = {
          USER_ALREADY_EXISTS: "Email already registered",
        };
        setError(errorMap[error.code] || "Registration failed");
        return;
      }

      // After successful sign up, set initial role (owner/worker)
      const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
      await fetch("/api/me/role", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role }),
      });

      // Redirect to login instead of dashboard/onboarding
      const params = new URLSearchParams({ registered: "true", role });
      router.push(`/login?${params.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="space-y-1 mb-6 text-center">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground">Join Tipsy to get started</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm" htmlFor="name">Full name</label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
            placeholder="Alex Doe"
          />
        </div>
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
              type={showPwd ? "text" : "password"}
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
              aria-label={showPwd ? "Hide password" : "Show password"}
              onClick={() => setShowPwd((v) => !v)}
              className="absolute inset-y-0 right-2 my-auto h-8 w-8 grid place-items-center text-muted-foreground hover:text-foreground"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
        <div className="space-y-2">
          <label className="text-sm" htmlFor="confirm">Confirm password</label>
          <div className="relative">
            <input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              autoComplete="off"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border rounded-md bg-background"
              placeholder="••••••••"
              minLength={minLen}
            />
            <button
              type="button"
              aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute inset-y-0 right-2 my-auto h-8 w-8 grid place-items-center text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {/* Role selection */}
        <div className="space-y-2">
          <label className="text-sm">I am a</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("worker")}
              className={`h-10 rounded-md border px-3 text-sm ${role === "worker" ? "bg-foreground text-background" : "hover:bg-accent"}`}
            >
              Worker
            </button>
            <button
              type="button"
              onClick={() => setRole("owner")}
              className={`h-10 rounded-md border px-3 text-sm ${role === "owner" ? "bg-foreground text-background" : "hover:bg-accent"}`}
            >
              Owner
            </button>
          </div>
          <p className="text-xs text-muted-foreground">You can change this later in settings (owners with restaurants cannot switch to worker).</p>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 rounded-md border hover:bg-accent"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
        <div className="text-sm text-center">
          Already have an account? <a className="underline" href="/login">Sign in</a>
        </div>
      </form>
    </div>
  );
}