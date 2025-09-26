"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Paintbrush, Settings2, ShieldCheck, Gauge } from "lucide-react";

const LS_USER_KEY = "admin_username";
const LS_PASS_KEY = "admin_password";
const LS_AUTH_KEY = "adminLocalAuthed";
const LS_FEATURES_KEY = "admin_features";
const LS_THEME_KEY = "admin_theme";
const LS_FONT_KEY = "admin_font";

const palettes = [
  {
    id: "default",
    name: "Default (Neutral)",
    vars: {
      primary: "oklch(0.205 0 0)",
      accent: "oklch(0.97 0 0)",
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    vars: {
      primary: "oklch(0.6 0.118 184.704)",
      accent: "oklch(0.828 0.189 84.429)",
      background: "oklch(0.985 0.02 200)",
      foreground: "oklch(0.2 0.02 200)",
    },
  },
  {
    id: "grape",
    name: "Grape",
    vars: {
      primary: "oklch(0.488 0.243 264.376)",
      accent: "oklch(0.627 0.265 303.9)",
      background: "oklch(0.985 0.02 300)",
      foreground: "oklch(0.2 0.02 300)",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    vars: {
      primary: "oklch(0.646 0.222 41.116)",
      accent: "oklch(0.769 0.188 70.08)",
      background: "oklch(0.99 0.03 70)",
      foreground: "oklch(0.2 0.03 70)",
    },
  },
];

const fonts = [
  { id: "system-ui", name: "System UI", stack: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji"' },
  { id: "inter", name: "Inter-like", stack: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' },
  { id: "geist", name: "Geist (default)", stack: 'var(--font-geist-sans), ui-sans-serif, system-ui' },
  { id: "mono", name: "Mono", stack: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
];

const defaultFeatures = {
  compactMode: false,
  animations: true,
  experimentalLayout: false,
};

function loadFeatures() {
  try {
    const raw = localStorage.getItem(LS_FEATURES_KEY);
    return raw ? { ...defaultFeatures, ...JSON.parse(raw) } : defaultFeatures;
  } catch {
    return defaultFeatures;
  }
}

function saveFeatures(val: typeof defaultFeatures) {
  localStorage.setItem(LS_FEATURES_KEY, JSON.stringify(val));
}

function applyFeatures(feat: typeof defaultFeatures) {
  const b = document.body;
  b.classList.toggle("compact-mode", !!feat.compactMode);
  b.classList.toggle("anim-enabled", !!feat.animations);
  b.classList.toggle("layout-experimental", !!feat.experimentalLayout);
}

function applyPalette(paletteId: string) {
  const p = palettes.find((x) => x.id === paletteId) || palettes[0];
  const r = document.documentElement;
  r.style.setProperty("--primary", p.vars.primary);
  r.style.setProperty("--accent", p.vars.accent);
  r.style.setProperty("--background", p.vars.background);
  r.style.setProperty("--foreground", p.vars.foreground);
  localStorage.setItem(LS_THEME_KEY, paletteId);
}

function applyFont(fontId: string) {
  const f = fonts.find((x) => x.id === fontId) || fonts[2];
  document.body.style.fontFamily = f.stack;
  localStorage.setItem(LS_FONT_KEY, fontId);
}

function useAuthed() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(typeof window !== "undefined" && localStorage.getItem(LS_AUTH_KEY) === "true");
  }, []);
  return authed;
}

export function AdminLocalApp() {
  const router = useRouter();
  const authed = useAuthed();

  const [tab, setTab] = useState<"account" | "appearance" | "features" | "monitor">("account");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [features, setFeatures] = useState(defaultFeatures);
  const [paletteId, setPaletteId] = useState("default");
  const [fontId, setFontId] = useState("geist");

  const traffic = useMemo(() => ({
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    language: typeof navigator !== "undefined" ? navigator.language : "",
    viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "",
    time: new Date().toLocaleString(),
    referrer: typeof document !== "undefined" ? document.referrer : "",
  }), []);

  useEffect(() => {
    if (!authed) return;
    const u = localStorage.getItem(LS_USER_KEY) || "admin";
    const p = localStorage.getItem(LS_PASS_KEY) || "admin";
    const feat = loadFeatures();
    const theme = localStorage.getItem(LS_THEME_KEY) || "default";
    const font = localStorage.getItem(LS_FONT_KEY) || "geist";
    setUsername(u);
    setPassword(p);
    setFeatures(feat);
    setPaletteId(theme);
    setFontId(font);
    // apply
    applyFeatures(feat);
    applyPalette(theme);
    applyFont(font);
  }, [authed]);

  if (!authed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-xl border bg-card p-6">
          <h1 className="text-xl font-semibold mb-2">Admin Panel (Hidden)</h1>
          <p className="text-sm text-muted-foreground">Access denied. Use the lock button (bottom-right) to unlock. Or <button className="underline" onClick={() => router.push("/?unlock=1")}>open unlock</button>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5" />
        <h1 className="text-2xl font-semibold">Local Admin</h1>
        <span className="ml-auto text-xs text-muted-foreground">Local only • Unlinked • Not secure for production</span>
      </div>

      <div className="mb-4 flex items-center gap-2 overflow-x-auto">
        <button onClick={() => setTab("account")} className={`rounded-md border px-3 py-1.5 text-sm hover:bg-accent ${tab === "account" ? "bg-accent" : ""}`}>
          <Settings2 className="mr-1 inline h-4 w-4" /> Account
        </button>
        <button onClick={() => setTab("appearance")} className={`rounded-md border px-3 py-1.5 text-sm hover:bg-accent ${tab === "appearance" ? "bg-accent" : ""}`}>
          <Paintbrush className="mr-1 inline h-4 w-4" /> Appearance
        </button>
        <button onClick={() => setTab("features")} className={`rounded-md border px-3 py-1.5 text-sm hover:bg-accent ${tab === "features" ? "bg-accent" : ""}`}>
          <Lock className="mr-1 inline h-4 w-4" /> Features
        </button>
        <button onClick={() => setTab("monitor")} className={`rounded-md border px-3 py-1.5 text-sm hover:bg-accent ${tab === "monitor" ? "bg-accent" : ""}`}>
          <Gauge className="mr-1 inline h-4 w-4" /> Monitor
        </button>
      </div>

      {tab === "account" && (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-medium mb-3">Admin Credentials</h2>
          <p className="text-xs text-muted-foreground mb-4">Change the hidden admin username/password for the lock modal. Defaults are admin/admin.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Username</label>
              <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Password</label>
              <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90"
              onClick={() => {
                localStorage.setItem(LS_USER_KEY, username || "admin");
                localStorage.setItem(LS_PASS_KEY, password || "admin");
              }}
            >
              Save
            </button>
            <button
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => {
                setUsername(localStorage.getItem(LS_USER_KEY) || "admin");
                setPassword(localStorage.getItem(LS_PASS_KEY) || "admin");
              }}
            >
              Reset
            </button>
          </div>
        </section>
      )}

      {tab === "appearance" && (
        <section className="rounded-xl border bg-card p-5 space-y-6">
          <div>
            <h2 className="font-medium mb-2">Color Palette</h2>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {palettes.map((p) => (
                <button
                  key={p.id}
                  className={`rounded-lg border p-3 text-left hover:bg-accent ${paletteId === p.id ? "ring-2 ring-ring" : ""}`}
                  onClick={() => { setPaletteId(p.id); applyPalette(p.id); }}
                >
                  <div className="mb-2 font-medium">{p.name}</div>
                  <div className="flex gap-2">
                    <span className="h-6 w-6 rounded" style={{ background: p.vars.primary }} />
                    <span className="h-6 w-6 rounded" style={{ background: p.vars.accent }} />
                    <span className="h-6 w-6 rounded" style={{ background: p.vars.background }} />
                    <span className="h-6 w-6 rounded border" style={{ background: p.vars.foreground }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-medium mb-2">Custom Colors</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {(["--primary", "--accent", "--background", "--foreground"]).map((key) => (
                <div key={key}>
                  <label className="block text-xs text-muted-foreground mb-1">{key}</label>
                  <input
                    type="text"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="oklch(...) or color"
                    onBlur={(e) => {
                      document.documentElement.style.setProperty(key, e.target.value);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-medium mb-2">Font</h2>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {fonts.map((f) => (
                <button key={f.id} className={`rounded-lg border p-3 text-left hover:bg-accent ${fontId === f.id ? "ring-2 ring-ring" : ""}`} onClick={() => { setFontId(f.id); applyFont(f.id); }}>
                  <div className="font-medium" style={{ fontFamily: f.stack }}>{f.name}</div>
                  <div className="text-xs text-muted-foreground" style={{ fontFamily: f.stack }}>The quick brown fox jumps over the lazy dog.</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "features" && (
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-medium">Feature Toggles</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={features.compactMode} onChange={(e) => {
                const next = { ...features, compactMode: e.target.checked };
                setFeatures(next); saveFeatures(next); applyFeatures(next);
              }} />
              <span className="text-sm">Compact mode</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={features.animations} onChange={(e) => {
                const next = { ...features, animations: e.target.checked };
                setFeatures(next); saveFeatures(next); applyFeatures(next);
              }} />
              <span className="text-sm">Enable animations</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={features.experimentalLayout} onChange={(e) => {
                const next = { ...features, experimentalLayout: e.target.checked };
                setFeatures(next); saveFeatures(next); applyFeatures(next);
              }} />
              <span className="text-sm">Experimental layout</span>
            </label>
          </div>
        </section>
      )}

      {tab === "monitor" && (
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-medium">Monitor</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground mb-1">User agent</div>
              <div className="text-sm break-all">{traffic.userAgent}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground mb-1">Language</div>
              <div className="text-sm">{traffic.language}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground mb-1">Viewport</div>
              <div className="text-sm">{traffic.viewport}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground mb-1">Time</div>
              <div className="text-sm">{traffic.time}</div>
            </div>
            <div className="rounded-lg border p-3 sm:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Referrer</div>
              <div className="text-sm break-all">{traffic.referrer || "(none)"}</div>
            </div>
          </div>
          <div className="pt-2 text-xs text-muted-foreground">Security tips: Avoid exposing this panel publicly. Credentials are stored locally only.</div>
        </section>
      )}
    </div>
  );
}

export default AdminLocalApp;