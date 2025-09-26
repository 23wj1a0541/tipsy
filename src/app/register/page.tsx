"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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

      // Redirect to onboarding based on role
      router.push(role === "owner" ? "/onboarding/owner" : "/onboarding/worker");
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
        <div className="space-y-2">
          <label className="text-sm" htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            type="password"
            autoComplete="off"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
            placeholder="••••••••"
          />
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