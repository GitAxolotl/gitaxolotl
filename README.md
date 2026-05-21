# GitAxolotl

![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

> A calm builder control room for the GitLawB hosted playground. Import a GitHub repository or a live website, watch the brief and quality gates resolve, then publish.

![GitAxolotl builder control room](docs/overview.png)

## What it is

GitAxolotl is the front door for the GitLawB app builder. It deliberately keeps the surface small:

- One **source intake** that accepts either a GitHub repo (`owner/repo`, SSH, or HTTPS URL) or a live website URL.
- A **pipeline** with four named steps — Intake → Brief → Build → Verify.
- A **quality gates** panel where every gate has an owner, a score, and visible evidence.
- A short **activity log** — no fake streaming, no emoji rain.
- A **handoff** block ready for GitHub review or the hosted playground.

No marketing-template hero sections, no decorative animation, no “AI dashboard” energy.

## Tech

- Vite + React 19 + TypeScript 6
- Single-file app shell: `src/App.tsx` + `src/index.css`
- Zero runtime dependencies beyond React
- Restrained design tokens, accessible focus rings, reduced-motion aware

## Getting started

```bash
git clone https://github.com/GitAxolotl/gitaxolotl.git
cd gitaxolotl
npm install
npm run dev
```

Useful scripts:

- `npm run dev` — local dev server
- `npm run build` — type-check + Vite production build
- `npm run lint` — ESLint
- `npm run preview` — preview the production build locally

## Handoff to the playground

The shell is intentionally single-file so it can be lifted into [playground.gitlawb.com](https://playground.gitlawb.com/) without rewriting. The `vercel.json` in the repo keeps the SPA fallback and long-cache headers on `/assets` for a boring, predictable deploy.

## License

MIT
