# GitAxolotl

![Base](https://img.shields.io/badge/Base-0052FF?style=flat-square&logo=coinbase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

> Network error detection & regeneration dashboard for the GitLawB decentralized agent network.

![Screenshot](docs/overview.png)

## How it works

```mermaid
flowchart LR
    A([GitLawB Network]) -->|"scan"| B[Error Detection]

    subgraph GitAxolotl
        C["01 Critical"]
        D["02 Diagnosed"]
        E["03 Regenerating"]
        F["04 Healed"]
    end

    B --> C --> D --> E --> F

    subgraph "Agent Fleet"
        G[CIPHER]
        H[FORGE]
        I[HELIX]
        J[ATLAS]
        K[QUILL]
        L[NEXUS]
    end

    D --> G & H & I & J & K & L
    F --> M([Network Restored])
```

## Features

- **Healing Pipeline** — 4-stage visualization: Critical → Diagnosed → Regenerating → Healed
- **18 Error Cards** — severity pills, file paths, agent assignments, progress bars, expandable descriptions
- **Agent Health Grid** — 6 agents with SVG ring charts, specialty tags, success rates
- **Regeneration Log** — terminal-style streaming feed, new entries every 3.5s
- **Axolotl Mascot** — line-art cursor follower with smooth lerp, tail wave, breathing animation
- **Monochrome Design** — black/white/glassmorphism, custom cursor, stagger animations
- **Keyboard Shortcuts** — `1`-`4` filter by stage, `0` clears, `Escape` collapses
- **Mobile Responsive** — stacks to 2-column grid, hides mascot on small screens

## Getting started

```bash
git clone https://github.com/GitAxolotl/gitaxolotl.git
cd gitaxolotl
npm install
npm run dev
```

## Tech

- Vite + React 19 + TypeScript 6
- Single-file architecture: `src/App.tsx` + `src/index.css`
- Zero runtime dependencies beyond React
- Canvas-based axolotl cursor follower

## License

MIT
