# GitAxolotl

[![CI](https://github.com/GitAxolotl/gitaxolotl/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/GitAxolotl/gitaxolotl/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vite](https://img.shields.io/badge/Vite-react--ts-646CFF?logo=vite)](https://vitejs.dev/)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FGitAxolotl%2Fgitaxolotl)

> Network error regeneration dashboard for the GitLawB / OpenClaude ecosystem.

GitAxolotl visualises infrastructure errors as a healing pipeline that flows
from **CRITICAL → DIAGNOSED → REGENERATING → HEALED**, just like an axolotl
regrowing a limb. A wandering pink mascot swims across the dashboard while
six agents (CIPHER, FORGE, HELIX, ATLAS, QUILL, NEXUS) regenerate the
network in real time.

![Screenshot](docs/overview.png)

## Highlights

- **Five live sections**
  - Sticky status bar with per-severity sparklines
  - 4-stage Healing Pipeline with animated cyan packet flow + arrowheads
  - 18 Healing Cards (severity pill, file path, agent button, striped
    progress bar, expandable timeline)
  - 6 Agent rings (SVG count-up, green / amber / red by health)
  - Terminal-style Regeneration Log streaming new entries every 3.5 s
- **Wandering Axolotl mascot** — random-walk steering with tail swish, gill
  flutter, dorsal-fin undulation, trail bubbles, and click-to-dart at the
  cursor.
- **Atmosphere** — particle field background, mouse-follow cursor glow,
  scanline overlay, viewport vignette.
- **Cross-section linking** — clicking a pipeline stage or an agent filters
  the cards and re-counts the status bar; clicking an agent inside a card
  scrolls to and highlights the agent grid.
- **Keyboard shortcuts** — `1` / `2` / `3` / `4` filter by stage, `0` clears.
- **Mobile rules** — ≤768 px stacks into 2-column status grid + vertical
  pipeline; ≤480 px hides the mascot.

## Tech

- Vite + React + TypeScript
- Single-file architecture: `src/App.tsx` + `src/index.css`
- Zero runtime dependencies beyond React

## Getting started

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # produces dist/
npm run preview
```

## Project layout

```
src/
  App.tsx       # all components, hooks, mock data
  index.css     # design tokens, layout, animations
  main.tsx      # React root
index.html
```

## Mock data

Static for now — `MOCK_ERRORS` (18), `MOCK_AGENTS` (6), and `LOG_SEEDS` (10
cycling lines) live at the top of `App.tsx`. Swap them with a real feed
when wiring to the GitLawB control plane.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FGitAxolotl%2Fgitaxolotl)

The repo includes `vercel.json` for SPA rewrites and immutable asset caching.
Click the button above, sign in to Vercel, and Vercel will detect Vite, run
`npm run build`, and deploy `dist/` to a `*.vercel.app` URL automatically.

To bind a custom domain (e.g. `gitaxolotl.gitlawb.app`) — in the Vercel project
settings, add the domain and point a `CNAME` from the DNS provider to
`cname.vercel-dns.com`.

## Continuous integration

Every push to `main` and every pull request triggers
`.github/workflows/ci.yml`, which runs **lint → typecheck → build** on Node 22
and uploads the `dist/` bundle as an artifact (7-day retention).

Dependabot watches `package.json` weekly (Monday 09:00 Asia/Jakarta) and
GitHub Actions monthly, grouping updates by react / vite / eslint /
typescript.

## License

[MIT](LICENSE) © devgitlawb
