"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "admin" | "owner" | "worker";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

type ListResponse = {
  data: UserRow[];
  total: number;
  page: number;
  pageSize: number;
};

export const AdminUsersManager = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<"createdAt" | "email" | "name" | "role">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : "";
      const params = new URLSearchParams({
        search,
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortDir,
      });
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Failed to load users (${res.status})`);
      }
      const data: ListResponse = await res.json();
      setRows(data.data || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page, pageSize, sortBy, sortDir]);

  const updateRole = async (userId: string, role: Role) => {
    setUpdatingId(userId);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : "";
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Failed to update role (${res.status})`);
      }
      await fetchUsers();
    } catch (e: any) {
      setError(e?.message || "Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
        <h1 className="text-xl font-semibold">User Management</h1>
        <div className="flex gap-2 items-center">
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search by name or email"
            className="w-64 max-w-full px-3 py-2 border rounded-md bg-background"
          />
          <select
            value={pageSize}
            onChange={(e) => {
              setPage(1);
              setPageSize(Number(e.target.value));
            }}
            className="px-2 py-2 border rounded-md bg-background"
          >
            {[10, 20, 50].map((s) => (
              <option key={s} value={s}>{s}/page</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {[
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "role", label: "Role" },
                { key: "createdAt", label: "Created" },
                { key: "actions", label: "Actions" },
              ].map((col) => (
                <th key={col.key} className="text-left px-3 py-2 whitespace-nowrap">
                  {col.key !== "actions" ? (
                    <button
                      className={`inline-flex items-center gap-1 ${sortBy === col.key ? "font-semibold" : ""}`}
                      onClick={() => {
                        if (col.key === "actions") return;
                        if (sortBy === (col.key as any)) {
                          setSortDir(sortDir === "asc" ? "desc" : "asc");
                        } else {
                          setSortBy(col.key as any);
                          setSortDir("asc");
                        }
                      }}
                    >
                      {col.label}
                      {sortBy === col.key && (
                        <span className="text-xs opacity-60">{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Loading users…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-destructive">{error}</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No users found</td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{u.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{u.email}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <select
                        className="px-2 py-1 border rounded-md bg-background"
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value as Role)}
                        disabled={updatingId === u.id}
                      >
                        <option value="admin">admin</option>
                        <option value="owner">owner</option>
                        <option value="worker">worker</option>
                      </select>
                      {updatingId === u.id && (
                        <span className="text-xs text-muted-foreground">Saving…</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      className="px-2 py-1 border rounded-md text-xs hover:bg-accent"
                      onClick={() => navigator.clipboard.writeText(u.email)}
                    >
                      Copy email
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages} • {total} users
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 border rounded-md disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            Prev
          </button>
          <button
            className="px-3 py-1.5 border rounded-md disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersManager;