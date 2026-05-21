# Windy Drops Site

Marketing site for **Windy Drops** — the open marketplace for the Windy ecosystem.

🌐 Lives at: [https://windydrops.com](https://windydrops.com)
🛡 Insurance domain: `windydrop.com` (redirects to apex)

## Stack

Vanilla HTML + CSS + a few Cloudflare Pages Functions for dynamic routes (drop pages, oEmbed). The landing page is intentionally static.

## Routes

| Path | Renderer | Strand |
|---|---|---|
| `/` | `dist/index.html` (static) | M0 |
| `/d/{id}` | `functions/d/[id].ts` — fetches registry, renders OG-rich card so the URL unfurls cleanly in Twitter / Discord / iMessage / Slack | WD-24 |
| `/browse`, `/search`, `/@<handle>`, `/me/library`, `/me/payouts` | (future) marketplace UI | WD-26 |
| `/integrate/{id}` | (future) auth-gated install flow | WD-26 |

A richer site will come once the platform copy + visual language is locked. Until then this is a one-page landing plus the share-URL unfurl handler.

## Local preview

```bash
cd dist
python3 -m http.server 8787
# open http://localhost:8787
```

## Deploy

Pushes to `main` trigger a Cloudflare Pages deploy (configured once windydrops.com is wired to a Pages project).

## Companion repos

- **[`sneakyfree/windy-drops`](https://github.com/sneakyfree/windy-drops)** — the platform code, spec, SDK
- **[`sneakyfree/windy-control-panel`](https://github.com/sneakyfree/windy-control-panel)** — the first consumer surface

## License

MIT.
