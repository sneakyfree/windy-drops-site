# Windy Drops Site

Marketing site for **Windy Drops** — the open marketplace for the Windy ecosystem.

🌐 Lives at: [https://windydrops.com](https://windydrops.com)
🛡 Insurance domain: `windydrop.com` (redirects to apex)

## Stack

Vanilla HTML + CSS — deliberately minimal until the brand language settles. Cloudflare Pages-hosted, statically built (no build step required for v0).

A richer site will come once the platform copy + visual language is locked. Until then this is a one-page landing that names the thing, sets expectation, and routes interested visitors to the right surfaces.

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
