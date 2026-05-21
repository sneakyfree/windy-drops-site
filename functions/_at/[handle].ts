// functions/_at/[handle].ts — CF Pages Function for /@<handle>.
//
// CF Pages doesn't support `@` directly in path segments, so windydrops.com
// routes /@<handle> via _redirects or via this catch-all under /_at/. We
// register a redirect from /@(.*) → /_at/$1 in _redirects.

interface AuthorProfile {
  handle: string;
  display_name: string;
  passport: string | null;
  integrity_band: string | null;
  follower_count: number;
  drop_count: number;
  lifetime_tips_cents: number;
  joined_at: string;
}

interface DropSummary {
  id: string;
  type: string;
  current_version: string;
  name?: string | Record<string, string>;
  subtitle?: string | Record<string, string>;
  install_count?: number;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]!));
}

function resolveI18n(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const d = value as Record<string, string>;
    return d[d.default] || Object.values(d).find(v => typeof v === "string") || "";
  }
  return "";
}

export const onRequest: PagesFunction<{ REGISTRY_URL?: string }> = async (ctx) => {
  const handle = ctx.params.handle as string;
  const registry = ctx.env.REGISTRY_URL ?? "https://api.windydrops.com";

  let profile: AuthorProfile | null = null;
  let drops: DropSummary[] = [];
  try {
    const [pr, dr] = await Promise.all([
      fetch(`${registry}/api/v1/authors/${encodeURIComponent(handle)}`),
      fetch(`${registry}/api/v1/authors/${encodeURIComponent(handle)}/drops?limit=30`),
    ]);
    if (pr.ok) profile = await pr.json();
    if (dr.ok) drops = (await dr.json()).items || [];
  } catch {
    // fall through to 404
  }

  if (!profile) {
    return new Response(notFoundHtml(handle), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return new Response(renderProfile(profile, drops), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
};


function renderProfile(p: AuthorProfile, drops: DropSummary[]): string {
  const handle = escapeHtml(p.handle);
  const name = escapeHtml(p.display_name);
  const integrity = p.integrity_band
    ? `<span class="badge">${escapeHtml(p.integrity_band)} integrity</span>` : "";
  const tips = p.lifetime_tips_cents > 0
    ? `<span>$${(p.lifetime_tips_cents / 100).toFixed(2)} lifetime tips</span>` : "";

  const dropCards = drops.length === 0
    ? `<p style="color:var(--muted);text-align:center;padding:32px;">No drops yet.</p>`
    : drops.map(d => {
        const dname = escapeHtml(resolveI18n(d.name) || d.id);
        const dsubtitle = escapeHtml(resolveI18n(d.subtitle) || "");
        return `<a class="card" href="/d/${escapeHtml(d.id)}">
          <div class="card-type">${escapeHtml(d.type)}</div>
          <div class="card-name">${dname}</div>
          <div class="card-subtitle">${dsubtitle}</div>
          <div class="card-meta"><span>${d.install_count || 0} installs</span> <span>v${escapeHtml(d.current_version)}</span></div>
        </a>`;
      }).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>@${handle} — Windy Drops</title>
<meta name="description" content="${name} on Windy Drops">
<meta property="og:title" content="${name} (@${handle})">
<meta property="og:description" content="${drops.length} drops by ${name} on Windy Drops.">
<meta property="og:type" content="profile">
<meta property="og:url" content="https://windydrops.com/@${handle}">
<link rel="stylesheet" href="/styles.css">
<style>
  .author-shell { max-width: 1000px; margin: 0 auto; padding: 48px 24px; }
  .author-header { margin-bottom: 32px; }
  .handle { color: var(--accent); font-size: 16px; }
  .author-name { font-size: 36px; font-weight: 700; margin: 4px 0 12px; }
  .author-meta { display: flex; gap: 16px; color: var(--muted); font-size: 14px; flex-wrap: wrap; }
  .badge { background: var(--accent-soft); color: var(--accent); padding: 2px 10px; border-radius: 999px; font-size: 12px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 24px; }
  .card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 20px; text-decoration: none; color: var(--fg); }
  .card:hover { border-color: var(--accent); }
  .card-type { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); margin-bottom: 8px; }
  .card-name { font-size: 18px; font-weight: 600; margin-bottom: 6px; }
  .card-subtitle { color: var(--muted); font-size: 14px; line-height: 1.4; margin-bottom: 16px; min-height: 40px; }
  .card-meta { display: flex; gap: 12px; font-size: 12px; color: var(--muted); }
</style>
</head>
<body>
<div class="author-shell">
  <div class="author-header">
    <div class="handle">@${handle}</div>
    <h1 class="author-name">${name}</h1>
    <div class="author-meta">
      <span id="follower-count">${p.follower_count} followers</span>
      <span>${p.drop_count} drops</span>
      ${tips}
      ${integrity}
    </div>
    <!-- F8: follow/unfollow button -->
    <button id="follow-btn" style="margin-top:16px;padding:10px 20px;background:var(--accent);color:white;border:0;border-radius:6px;font-weight:600;cursor:pointer;display:none;">Follow</button>
  </div>
  <h2 style="font-size:18px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Drops</h2>
  <div class="grid">${dropCards}</div>
</div>

<script src="/auth.js"></script>
<script>
// F8: Follow / Unfollow button (signed-in only).
const handle = ${JSON.stringify(handle)};
const btn = document.getElementById('follow-btn');
async function refreshFollowState() {
  if (!WindyAuth.isSignedIn()) {
    btn.style.display = 'inline-block';
    btn.textContent = 'Sign in to follow';
    btn.onclick = function() { WindyAuth.signIn(window.location.pathname); };
    return;
  }
  try {
    const body = await WindyAuth.get('/api/v1/me/follows', { auth: true });
    const following = body.items.some(function(f) { return f.followed_handle === handle; });
    btn.style.display = 'inline-block';
    if (following) {
      btn.textContent = 'Following ✓ (click to unfollow)';
      btn.style.background = 'transparent';
      btn.style.border = '1px solid var(--accent)';
      btn.style.color = 'var(--accent)';
      btn.onclick = async function() {
        await WindyAuth.del('/api/v1/me/follows/' + encodeURIComponent(handle));
        refreshFollowState();
      };
    } else {
      btn.textContent = 'Follow';
      btn.style.background = 'var(--accent)';
      btn.style.border = '0';
      btn.style.color = 'white';
      btn.onclick = async function() {
        await WindyAuth.post('/api/v1/me/follows', { author_handle: handle });
        refreshFollowState();
      };
    }
  } catch (e) {
    // Not signed in or network — leave button hidden.
  }
}
refreshFollowState();
</script>
</body>
</html>`;
}


function notFoundHtml(handle: string): string {
  const safe = escapeHtml(handle);
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>@${safe} not found — Windy Drops</title>
<link rel="stylesheet" href="/styles.css">
</head><body style="text-align:center;padding:64px;color:var(--fg);background:var(--bg);font-family:sans-serif;">
<h1>No author named @${safe}</h1>
<p><a href="/" style="color:var(--accent)">← back to Windy Drops</a></p>
</body></html>`;
}
