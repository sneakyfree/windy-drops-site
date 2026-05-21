// functions/d/[id].ts — CF Pages Function that resolves /d/{id} to a
// rich HTML page with OpenGraph meta tags so the URL unfurls cleanly in
// Twitter, Discord, iMessage, Slack, TikTok preview, etc.
//
// Strand: WD-24 of sneakyfree/windy-drops/docs/DNA_STRAND_MASTER_PLAN.md.
// Closes ADR-053 acceptance criterion #11 ("share URL unfurls").
//
// The page itself is mostly OG metadata + a fetch-from-registry placeholder
// body. The real interactive marketplace UI lives at /browse and /search
// (WD-26).

interface DropDetail {
  id: string;
  type: string;
  current_version: string;
  manifest: Record<string, unknown>;
  name?: string | Record<string, string>;
  subtitle?: string | Record<string, string>;
  install_count?: number;
  fork_count?: number;
  rating_avg?: number | null;
  rating_count?: number;
  signer_passport?: string | null;
}

const REGISTRY_URL =
  // Override via wrangler env var at deploy time; default to prod.
  // CF Pages Functions read env via the second handler arg.
  "https://api.windydrops.com";

function resolveI18n(value: unknown, lang: string = "en"): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const dict = value as Record<string, string>;
    if (lang in dict) return dict[lang];
    const def = dict["default"];
    if (def && def in dict) return dict[def];
  }
  return "";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const onRequest: PagesFunction<{ REGISTRY_URL?: string }> = async (ctx) => {
  const dropId = ctx.params.id as string;
  const registryBase = ctx.env.REGISTRY_URL ?? REGISTRY_URL;

  // Fetch drop detail. Cache on CF edge for 5 minutes.
  let drop: DropDetail | null = null;
  try {
    const r = await fetch(`${registryBase}/api/v1/drops/${encodeURIComponent(dropId)}`, {
      cf: { cacheTtl: 300, cacheEverything: true } as RequestInit["cf"],
    });
    if (r.ok) drop = await r.json();
  } catch {
    // fall through to 404 page
  }

  if (!drop) {
    return new Response(notFoundHtml(dropId), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const name = escapeHtml(resolveI18n(drop.name, "en") || drop.id);
  const subtitle = escapeHtml(resolveI18n(drop.subtitle, "en") || "");
  const ogImage = `https://drops.windydrops.com/${drop.id}/${drop.current_version}/preview.png`;
  const canonicalUrl = `https://windydrops.com/d/${drop.id}`;
  const integrateUrl = `https://windydrops.com/integrate/${drop.id}`;

  const html = renderHtml({
    name,
    subtitle,
    ogImage,
    canonicalUrl,
    integrateUrl,
    dropId: drop.id,
    type: drop.type,
    version: drop.current_version,
    installCount: drop.install_count ?? 0,
    forkCount: drop.fork_count ?? 0,
    rating: drop.rating_avg ?? null,
    ratingCount: drop.rating_count ?? 0,
    signerPassport: drop.signer_passport ?? null,
  });

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
};


function renderHtml(p: {
  name: string;
  subtitle: string;
  ogImage: string;
  canonicalUrl: string;
  integrateUrl: string;
  dropId: string;
  type: string;
  version: string;
  installCount: number;
  forkCount: number;
  rating: number | null;
  ratingCount: number;
  signerPassport: string | null;
}): string {
  const desc = p.subtitle || `${p.type} drop on Windy Drops`;
  const ratingLine = p.rating !== null && p.ratingCount > 0
    ? `${p.rating.toFixed(1)} ★ (${p.ratingCount})`
    : "";
  const sig = p.signerPassport
    ? `<span class="sig">✓ signed by ${escapeHtml(p.signerPassport)}</span>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${p.name} — Windy Drops</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escapeHtml(desc)}">

<!-- OpenGraph (Twitter, Facebook, LinkedIn, Discord, iMessage all support) -->
<meta property="og:title" content="${p.name}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:image" content="${p.ogImage}">
<meta property="og:url" content="${p.canonicalUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Windy Drops">

<!-- Twitter card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${p.name}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${p.ogImage}">

<!-- oEmbed discovery -->
<link rel="alternate" type="application/json+oembed"
      href="https://api.windydrops.com/api/v1/drops/${p.dropId}/oembed?format=json"
      title="${p.name}">

<link rel="canonical" href="${p.canonicalUrl}">
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; background: #0a0e14;
         color: #f0f6fc; margin: 0; padding: 2rem; }
  .card { max-width: 720px; margin: 0 auto; background: #161b22; border-radius: 12px;
          padding: 2rem; }
  h1 { margin: 0 0 0.5rem; font-size: 2rem; font-weight: 600; }
  .subtitle { color: #8b949e; margin: 0 0 1.5rem; }
  .meta { display: flex; gap: 1.5rem; color: #8b949e; font-size: 0.875rem;
          margin-bottom: 1.5rem; }
  .sig { color: #00d4ff; font-weight: 600; }
  .integrate { display: inline-block; padding: 0.75rem 1.5rem; background: #00d4ff;
               color: #0a0e14; text-decoration: none; border-radius: 6px;
               font-weight: 600; }
  .integrate:hover { background: #00b8db; }
  .preview { width: 100%; max-width: 600px; border-radius: 8px; margin: 1rem 0; }
</style>
</head>
<body>
  <div class="card">
    <h1>${p.name}</h1>
    <p class="subtitle">${escapeHtml(p.subtitle)}</p>
    <img class="preview" src="${p.ogImage}" alt="${p.name} preview" onerror="this.style.display='none'">
    <div class="meta">
      <span>${escapeHtml(p.type)}</span>
      <span>v${escapeHtml(p.version)}</span>
      <span>${p.installCount} installs</span>
      ${p.forkCount > 0 ? `<span>${p.forkCount} forks</span>` : ""}
      ${ratingLine ? `<span>${escapeHtml(ratingLine)}</span>` : ""}
      ${sig}
    </div>
    <a class="integrate" href="${p.integrateUrl}">Integrate</a>
  </div>
</body>
</html>`;
}


function notFoundHtml(dropId: string): string {
  const safe = escapeHtml(dropId);
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>Drop not found — Windy Drops</title>
<meta property="og:title" content="Drop not found">
<meta property="og:description" content="No drop with id ${safe}.">
<style>body{font-family:sans-serif;background:#0a0e14;color:#f0f6fc;padding:2rem;text-align:center}</style>
</head><body>
<h1>Drop not found</h1>
<p>No drop with id <code>${safe}</code>.</p>
<p><a href="https://windydrops.com" style="color:#00d4ff">← back to Windy Drops</a></p>
</body></html>`;
}
