# NxtUpdate website

Static website and Docs7 documentation for [NxtUpdate](https://github.com/scorpion7slayer/NxtUpdate), a universal package updater for macOS.

## Run locally

```sh
bun install
bun run dev
```

The Cloudflare Worker serves the landing page from `public/` and reverse-proxies
`/docs` and `/docs/*` to Docs7. Every other request stays on the static site.

## Validate

```sh
bun run check
```

This runs the Worker tests, TypeScript checks, HTML validation, and a dry-run
Cloudflare deployment.

## Preview the Docs7 documentation

```sh
bunx @upstash/docs7@latest dev ./docs
```

The Docs7 source lives in [`docs/`](docs/). In production, Docs7 serves it at
[`nxtupdate.nxtaigen.com/docs`](https://nxtupdate.nxtaigen.com/docs), while the
static landing page stays at the domain root.
