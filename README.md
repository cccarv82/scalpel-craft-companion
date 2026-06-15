# Scalpel Craft Companion

PoE2-first crafting helper plugin for [Scalpel](https://github.com/scalpelpoe/scalpel).

Step-by-step community recipes (Bow, Quiver, Body Armour, etc.), mod tier lookup powered by RePoE-fork, Ctrl+D auto-detect for step matching, currency budget tracking and votes/comments/completions.

## Backend

[scalpel-craft-companion-api.vercel.app](https://scalpel-craft-companion-api.vercel.app) — Next.js + Neon + Discord OAuth.

## Dev

```bash
npm install
npm run dev        # vite build --watch -> dist/plugin.js
npm run build      # production
npm run typecheck
```

Load into Scalpel: Settings → Developer → "Load unpacked plugin" → point at `dist/`.

## License

AGPL-3.0-only.
