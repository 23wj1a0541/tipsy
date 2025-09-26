"use client";

import { useEffect, useMemo, useState } from "react";

type Toggle = {
  id: number;
  key: string;
  label: string;
  enabled: number | boolean;
  audience: string;
  created_at?: string;
  updated_at?: string;
};

const audiences = ["all", "owners", "workers", "admins"] as const;

type Direction = "asc" | "desc";

export const FeatureTogglesManager = () => {
  const [data, setData] = useState<Toggle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [audience, setAudience] = useState<string>("");
  const [enabled, setEnabled] = useState<string>("");
  const [order, setOrder] = useState<"key" | "created_at" | "updated_at">(
    "created_at"
  );
  const [direction, setDirection] = useState<Direction>("desc");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (audience) p.set("audience", audience);
    if (enabled) p.set("enabled", enabled);
    if (order) p.set("order", order);
    if (direction) p.set("direction", direction);
    p.set("limit", "50");
    return p.toString();
  }, [search, audience, enabled, order, direction]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/feature-toggles?${qs}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setData(json.data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load feature toggles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  async function updateByKey(key: string, updates: Partial<Toggle>) {
    const res = await fetch(`/api/feature-toggles/key/${key}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Update failed");
    return res.json();
  }

  async function createToggle(payload: {
    key: string;
    label: string;
    audience: string;
    enabled: boolean;
  }) {
    const res = await fetch(`/api/feature-toggles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Create failed");
    return res.json();
  }

  async function deleteById(id: number) {
    const res = await fetch(`/api/feature-toggles/${id}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error("Delete failed");
    return res.json();
  }

  // Local form state for creation
  const [form, setForm] = useState({
    key: "",
    label: "",
    audience: "all",
    enabled: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await createToggle(form);
      setForm({ key: "", label: "", audience: "all", enabled: true });
      await load();
    } catch (e) {
      setError("Failed to create feature toggle");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by key or label"
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          />
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">Audience: any</option>
            {audiences.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={enabled}
            onChange={(e) => setEnabled(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">Status: any</option>
            <option value="1">Enabled</option>
            <option value="0">Disabled</option>
          </select>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value as any)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="created_at">Newest</option>
            <option value="updated_at">Recently updated</option>
            <option value="key">Key</option>
          </select>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <button
            onClick={load}
            className="h-9 px-3 rounded-md border border-input text-sm hover:bg-accent"
          >
            Refresh
          </button>
        </div>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
          <input
            required
            value={form.key}
            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            placeholder="key (e.g., qr_payments)"
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          />
          <input
            required
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="Label"
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          />
          <select
            value={form.audience}
            onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            {audiences.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
            Enabled
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="h-9 px-3 rounded-md border border-input text-sm bg-foreground text-background hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Add Feature"}
          </button>
        </form>
      </div>

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left">
              <th className="p-3 font-medium">Key</th>
              <th className="p-3 font-medium">Label</th>
              <th className="p-3 font-medium">Audience</th>
              <th className="p-3 font-medium">Enabled</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={5}>Loading...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td className="p-3" colSpan={5}>No features found</td>
              </tr>
            ) : (
              data.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3 font-mono text-xs sm:text-sm">{t.key}</td>
                  <td className="p-3">
                    <input
                      defaultValue={t.label}
                      onBlur={async (e) => {
                        const val = e.target.value.trim();
                        if (val && val !== t.label) {
                          try {
                            await updateByKey(t.key, { label: val });
                            await load();
                          } catch {
                            setError("Failed to save label");
                          }
                        }
                      }}
                      className="w-full h-9 px-2 rounded-md border border-input bg-background"
                    />
                  </td>
                  <td className="p-3">
                    <select
                      defaultValue={t.audience}
                      onChange={async (e) => {
                        try {
                          await updateByKey(t.key, { audience: e.target.value });
                          await load();
                        } catch {
                          setError("Failed to save audience");
                        }
                      }}
                      className="h-9 px-2 rounded-md border border-input bg-background"
                    >
                      {audiences.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        defaultChecked={Boolean(t.enabled)}
                        onChange={async (e) => {
                          try {
                            await updateByKey(t.key, { enabled: e.target.checked });
                            await load();
                          } catch {
                            setError("Failed to save toggle");
                          }
                        }}
                      />
                      <span>{Boolean(t.enabled) ? "On" : "Off"}</span>
                    </label>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      className="px-2 py-1 text-xs rounded-md border border-input hover:bg-accent"
                      onClick={async () => {
                        try {
                          await deleteById(t.id);
                          await load();
                        } catch {
                          setError("Failed to delete");
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FeatureTogglesManager;