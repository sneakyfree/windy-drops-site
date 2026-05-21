// functions/integrate/[id].ts — F1. The /integrate/{id} flow.
//
// Renders a one-screen install prompt with the drop's name + Integrate
// button. Auth check + install call happen client-side via auth.js so we
// don't need to forward cookies through CF Pages.

const REGISTRY_URL = "https://api.windydrops.com";

interface DropDetail {
  id: string;
  type: string;
  current_version: string;
  manifest: Record<string, unknown>;
  name?: string | Record<string, string>;
  subtitle?: string | Record<string, string>;
}

function resolveI18n(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const d = value as Record<string, string>;
    return d[d.default] || Object.values(d).find(v => typeof v === "string") || "";
  }
  return "";
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]!));
}

export const onRequest: PagesFunction<{ REGISTRY_URL?: string }> = async (ctx) => {
  const dropId = ctx.params.id as string;
  const registry = ctx.env.REGISTRY_URL ?? REGISTRY_URL;

  let drop: DropDetail | null = null;
  try {
    const r = await fetch(`${registry}/api/v1/drops/${encodeURIComponent(dropId)}`);
    if (r.ok) drop = await r.json();
  } catch { /* */ }

  if (!drop) {
    return new Response(notFoundHtml(dropId), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const name = escapeHtml(resolveI18n(drop.name) || drop.id);
  const subtitle = escapeHtml(resolveI18n(drop.subtitle) || drop.type);

  return new Response(integrateHtml({ dropId: drop.id, name, subtitle, type: drop.type, version: drop.current_version }), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
};

function integrateHtml(p: { dropId: string; name: string; subtitle: string; type: string; version: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Integrate ${p.name} — Windy Drops</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/styles.css">
<style>
  .integ { max-width: 480px; margin: 0 auto; padding: 96px 24px; text-align: center; }
  .integ h1 { font-size: 28px; margin-bottom: 8px; }
  .integ .sub { color: var(--muted); margin-bottom: 32px; }
  .meta { color: var(--muted); font-size: 13px; margin-bottom: 32px; }
  .btn { display:inline-block; padding:14px 32px; background:var(--accent); color:white; border:0; border-radius:8px; font-weight:600; cursor:pointer; font-size:15px; text-decoration:none; }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .state { margin-top: 24px; min-height: 24px; }
  .state.ok { color: #38d39f; }
  .state.err { color: #ff6b6b; }
</style>
</head>
<body>
<div class="integ">
<h1>${p.name}</h1>
<p class="sub">${p.subtitle}</p>
<p class="meta">${p.type} · v${p.version}</p>

<button id="integ-btn" class="btn">Integrate</button>
<div id="state" class="state"></div>
<p style="margin-top:24px;"><a href="/d/${p.dropId}" style="color:var(--muted);font-size:13px;">← back to drop</a></p>
</div>

<script src="/auth.js"></script>
<script>
const dropId = ${JSON.stringify(p.dropId)};
const btn = document.getElementById("integ-btn");
const state = document.getElementById("state");

if (!WindyAuth.isSignedIn()) {
  state.textContent = "Sign in to integrate this drop.";
  btn.addEventListener("click", () => WindyAuth.signIn(window.location.pathname));
} else {
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    state.className = "state";
    state.textContent = "Installing…";
    try {
      await WindyAuth.post("/api/v1/me/library/install", { drop_id: dropId });
      state.className = "state ok";
      state.textContent = "✓ Installed to your library";
      btn.textContent = "View library →";
      btn.disabled = false;
      btn.onclick = () => window.location.href = "/me/library";
    } catch (e) {
      state.className = "state err";
      if (e.status === 402) state.textContent = "Paid drops launch in v1.1.";
      else if (e.status === 409) state.textContent = "Already in your library.";
      else if (e.status === 410) state.textContent = "This drop was withdrawn.";
      else if (e.status === 401) state.textContent = "Session expired — sign in again.";
      else state.textContent = "Install failed: " + (e.body?.detail?.error || e.status);
      btn.disabled = false;
    }
  });
}
</script>
</body>
</html>`;
}

function notFoundHtml(dropId: string): string {
  const safe = escapeHtml(dropId);
  return `<!doctype html><html><body style="font-family:sans-serif;text-align:center;padding:64px;background:#0a0e14;color:#f0f6fc;">
<h1>Drop not found</h1><p>No drop with id <code>${safe}</code>.</p>
<p><a href="/" style="color:#00d4ff">← Windy Drops</a></p></body></html>`;
}
