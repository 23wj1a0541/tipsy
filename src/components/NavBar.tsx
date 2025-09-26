"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";

export const NavBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending, refetch } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : "";
    const { error } = await authClient.signOut({
      fetchOptions: {
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      },
    });
    if (!error?.code) {
      if (typeof window !== "undefined") localStorage.removeItem("bearer_token");
      refetch();
      router.push("/");
    }
  };

  const isActive = (href: string) => pathname === href;

  // Compute dashboard link based on role
  const dashboardHref = session?.user
    ? session.user.role === "worker"
      ? "/dashboard/worker"
      : session.user.role === "owner"
        ? "/dashboard/owner"
        : "/admin"
    : "/";

  return (
    <header className="w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          Tipsy
        </Link>
        <nav className="hidden sm:flex items-center gap-4 text-sm">
          <Link className={`hover:underline ${isActive("/") ? "underline" : ""}`} href="/">Home</Link>
          {!!session?.user && (
            <Link
              className={`hover:underline ${isActive(dashboardHref) ? "underline" : ""}`}
              href={dashboardHref}
            >
              Dashboard
            </Link>
          )}
          {session?.user?.role === "admin" && (
            <Link className={`hover:underline ${isActive("/admin") ? "underline" : ""}`} href="/admin">Admin</Link>
          )}
          {!!session?.user ? (
            <button onClick={handleSignOut} className="px-3 py-1.5 rounded-md border border-input hover:bg-accent text-sm">Sign out</button>
          ) : (
            <Link className="px-3 py-1.5 rounded-md border border-input hover:bg-accent text-sm" href="/login">Sign in</Link>
          )}
        </nav>
        <button className="sm:hidden px-3 py-1.5 rounded-md border" onClick={() => setIsOpen((v) => !v)}>Menu</button>
      </div>
      {isOpen && (
        <div className="sm:hidden border-t">
          <div className="mx-auto max-w-6xl px-4 py-2 flex flex-col gap-2 text-sm">
            <Link href="/" className="py-1" onClick={() => setIsOpen(false)}>Home</Link>
            {!!session?.user && (
              <Link href={dashboardHref} className="py-1" onClick={() => setIsOpen(false)}>Dashboard</Link>
            )}
            {session?.user?.role === "admin" && (
              <Link href="/admin" className="py-1" onClick={() => setIsOpen(false)}>Admin</Link>
            )}
            {!!session?.user ? (
              <button onClick={handleSignOut} className="text-left py-1">Sign out</button>
            ) : (
              <Link href="/login" className="py-1" onClick={() => setIsOpen(false)}>Sign in</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default NavBar;