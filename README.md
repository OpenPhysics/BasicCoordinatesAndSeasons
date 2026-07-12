# Basic Coordinates and Seasons

A three-screen [SceneryStack](https://scenerystack.org/) port of the NAAP **Basic Coordinates and Seasons**
lab: **Terrestrial Coordinates**, **Celestial Coordinates**, and **Seasons**.
Built with Vite 8, TypeScript 7, and Biome 2.

> **Status:** all three screens are implemented — the NAAP terrestrial, celestial, and seasons
> explorers are ported on a shared orthographic sky engine, with localization, projector mode,
> keyboard/PDOM accessibility, home-screen icons, and unit tests in place.

## Features

- Three implemented screens on a shared orthographic sky engine, with model/view separation:
  1. **Terrestrial Coordinates** (`src/terrestrial/`) — longitude/latitude on a flat map and a globe
     (NAAP `tc_flat.swf` / `tc_globe.swf`).
  2. **Celestial Coordinates** (`src/celestial/`) — right ascension/declination on a flat sky map and a
     celestial sphere (NAAP `cec_flat.swf` / `cec_sky.swf`).
  3. **Seasons** (`src/seasons/`) — Earth's orbit, the ecliptic, and how axial tilt produces the seasons
     (NAAP `seasons_ecliptic.swf`, the Seasons and Ecliptic Simulator).
- English, French, and Spanish localization via `StringManager`
- Default and projector color profiles
- Progressive Web App (installable, offline-capable)
- Flash decompile workflow (`npm run decompile`) for NAAP `.swf` reference
- Git hooks for Biome pre-commit checks
- Shared GitHub Actions CI via `OpenPhysics/Baton`

The original lab (astroUNL `naap/motion1`) and its Flash sources live in the git-ignored `NAAP/`
directory. `npm run decompile` extracts readable ActionScript from the five published simulators into
`NAAP/decompiled/` via JPEXS FFDec (requires Java; one-time `npm run decompile -- --setup`).

## Quick Start

```bash
npm install
npm run icons    # generate PNG icons from public/icons/icon.svg
npm start        # dev server → http://localhost:5173
```

## Scripts

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run build:single` | Single self-contained `dist/index.html` |
| `npm run preview` | Preview the production build locally |
| `npm run check` | TypeScript type check |
| `npm run lint` | Biome lint check |
| `npm run format` | Auto-format all files |
| `npm run fix` | Lint + auto-fix |
| `npm test` | Run Vitest unit tests |
| `npm run icons` | Regenerate PNG icons from `public/icons/icon.svg` |
| `npm run decompile` | Extract ActionScript from NAAP Flash `.swf` sources |
| `npm run clean` | Remove `dist/` |

New sims start at `version: "0.0.0"` in `package.json`. Bump only when cutting a release (for example `npm version patch` and a matching git tag). Keep `name` in kebab-case; it is separate from the SceneryStack sim identifier in `src/init.ts`.

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| [SceneryStack](https://scenerystack.org/) | ^3.0.0 | Simulation framework |
| [Vite](https://vitejs.dev/) | ^8 | Build tool + dev server |
| [TypeScript](https://www.typescriptlang.org/) | ^7 | Type-safe JavaScript |
| [Biome](https://biomejs.dev/) | ^2.5 | Linting + formatting |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | ^1 | PWA + service worker |

## License

GNU Affero General Public License v3.0 — see [OpenPhysics org license](https://github.com/OpenPhysics/.github/blob/main/LICENSE).

## Contributing

See [OpenPhysics contributing guidelines](https://github.com/OpenPhysics/.github/blob/main/CONTRIBUTING.md).
Report bugs via GitHub Issues; use org issue templates.
