# CLAUDE.md — Basic Coordinates and Seasons

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

A three-screen SceneryStack simulation porting the NAAP **Basic Coordinates and Seasons**
lab (astroUNL `naap/motion1`), scaffolded from `TemplateSingleSim`. **Currently a framework
scaffold** — placeholder label + Reset All per screen; no models/physics yet.

- **Terrestrial Coordinates** (`src/terrestrial/`) — port of the NAAP terrestrial coordinate
  explorers (`tc_flat.swf` = flat map, `tc_globe.swf` = globe): longitude and latitude on Earth.
- **Celestial Coordinates** (`src/celestial/`) — port of the NAAP celestial equatorial coordinate
  explorers (`cec_flat.swf` = flat sky map, `cec_sky.swf` = celestial sphere): right ascension
  and declination.
- **Seasons** (`src/seasons/`) — port of the NAAP *Seasons and Ecliptic Simulator*
  (`seasons_ecliptic.swf`): Earth's orbit, axial tilt, the ecliptic, and the resulting seasons.

Shared code keeps the `BasicCoordinatesAndSeasons` prefix; per-screen code uses the
`Terrestrial` / `Celestial` / `Seasons` prefixes. Concept-named folders, no `-screen` suffix.
`RotatingSky/` (the motion2 lab port) is the closest sibling sim — its `SkyProjection` /
horizon-and-celestial-sphere view code is directly relevant to the Celestial screen.

## Key files

| File | Purpose |
|---|---|
| `src/BasicCoordinatesAndSeasonsColors.ts` | All `ProfileColorProperty` instances (default + projector profiles) |
| `src/BasicCoordinatesAndSeasonsConstants.ts` | Named numeric constants (layout px, physics SI units) |
| `src/BasicCoordinatesAndSeasonsNamespace.ts` | Namespace used by `.register()` |
| `src/common/BasicCoordinatesAndSeasonsPanel.ts` | Pre-themed `Panel` wrapper |
| `src/common/BasicCoordinatesAndSeasonsButtonOptions.ts` | Flat button-appearance option bundles + light-control-surface combo-box options |
| `src/common/TimeModel.ts` | Composable play/pause + elapsed-time model for animated sims |
| `src/i18n/StringManager.ts` | Singleton localized string accessor; per-screen name + a11y getters |
| `src/main.ts` | Entry point; registers the three screens |
| `src/terrestrial/TerrestrialScreen.ts` | `Screen<TerrestrialModel, TerrestrialScreenView>` wrapper |
| `src/celestial/CelestialScreen.ts` | `Screen<CelestialModel, CelestialScreenView>` wrapper |
| `src/seasons/SeasonsScreen.ts` | `Screen<SeasonsModel, SeasonsScreenView>` wrapper |
| `src/preferences/basicCoordinatesAndSeasonsQueryParameters.ts` | `QueryStringMachine` parameters |
| `scripts/decompile-flash.ts` | Extract ActionScript from the NAAP Flash `.swf` sources via JPEXS FFDec (→ `NAAP/decompiled/`) |

## Screens

Three screens registered in `src/main.ts`, in this order:

1. **Terrestrial Coordinates** (`src/terrestrial/`)
2. **Celestial Coordinates** (`src/celestial/`)
3. **Seasons** (`src/seasons/`)

When implementing: put shared physics in `src/common/`, per-screen state in each
`*Model.ts`. Per-screen a11y lives under `a11y.<screenKey>` in each locale JSON,
exposed via `StringManager.getTerrestrialA11yStrings()` / `getCelestialA11yStrings()` /
`getSeasonsA11yStrings()`. Make each `currentDetailsContent` a live `DerivedProperty`
over model state and add `accessibleName`s to every interactive node.

## Decompiling the Flash sources

`npm run decompile` (script: `scripts/decompile-flash.ts`) extracts readable
ActionScript from the NAAP Flash movies so the port can be diffed against the
originals. The `.fla` files are old binary projects no tool reads directly, so the
script decompiles their sibling compiled `.swf` via **JPEXS FFDec** (needs Java).

```sh
npm run decompile                 # the five lab explorers/simulators → NAAP/decompiled/<name>/scripts/*.as
npm run decompile -- --all        # + supporting concept demos
npm run decompile -- --list       # dry run: print what would be decompiled
npm run decompile -- --setup      # one-time: download FFDec into tools/ffdec/
```

Default targets (matched byte-for-byte to the published lab animations):
`mapExplorer010` (tc_flat), `longLatDemo014` (tc_globe), `simpleFlatSkyMap007` (cec_flat),
`skyMap028` (cec_sky), `eclipticSimulator025` (seasons_ecliptic; lab shipped 024).
Output goes to `NAAP/decompiled/` (git-ignored, along with `tools/ffdec/`). The
decompiled AS is a **read-only reference** — transcribe the maths into typed TS in
`src/`; don't vendor it.

## npm scripts

`start`/`dev` (vite) · `build` · `build:single` · `check` (tsc) · `lint`/`fix` (biome) ·
`test` (vitest) · `icons` · `decompile` · `rename`. Gate: `npm run check && npm run lint && npm run build && npm test`.

## PWA

After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
