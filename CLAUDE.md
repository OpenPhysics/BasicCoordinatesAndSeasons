# CLAUDE.md — Basic Coordinates and Seasons

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

SceneryStack port of the NAAP **Basic Coordinates and Seasons** lab ([astro.unl.edu/naap/motion1](https://astro.unl.edu/naap/motion1/motion1.html)). Three screens teach terrestrial and celestial coordinate systems, then use them to explain the seasons. Architecture and formulas: [doc/model.md](doc/model.md), [doc/implementation-notes.md](doc/implementation-notes.md).

- **Terrestrial Coordinates** (`src/terrestrial/`) — longitude and latitude on a flat map and orthographic globe.
- **Celestial Coordinates** (`src/celestial/`) — right ascension and declination on a flat sky map and celestial sphere.
- **Seasons** (`src/seasons/`) — Earth's tilted orbit, the ecliptic, and seasonal Sun angles.

Shared code uses the `BasicCoordinatesAndSeasons` prefix; per-screen code uses `Terrestrial` / `Celestial` / `Seasons`. Concept-named folders, no `-screen` suffix. `RotatingSky/` is the closest sibling — its `SkyProjection` / sky-view code is reused here.

## Key files

| Area | Location |
|---|---|
| Screens | `src/terrestrial/TerrestrialScreen.ts`, `src/celestial/CelestialScreen.ts`, `src/seasons/SeasonsScreen.ts` |
| Models | `terrestrial/model/TerrestrialModel.ts`, `celestial/model/CelestialModel.ts`, `seasons/model/SeasonsModel.ts` |
| Shared physics | `src/common/SunPosition.ts` (seasons), `src/common/SkyCoordinates.ts`, `src/common/SkyProjection.ts`, `src/common/formatAngles.ts` |
| Shared views | `src/common/view/skyGraphics.ts`, `CelestialSphereNode.ts`, `EarthGlobeNode.ts`, `FlatEarthMapNode.ts`, `attachSkyCameraInteraction.ts` |
| Animation | `src/common/TimeModel.ts` (composed into `SeasonsModel` only) |
| Colors / constants | `src/BasicCoordinatesAndSeasonsColors.ts`, `src/BasicCoordinatesAndSeasonsConstants.ts` |
| Strings | `src/i18n/StringManager.ts` |
| Preferences / query params | `src/preferences/` (`?earthMapResolution=`) |
| Entry | `src/main.ts` |

## Model

Three **independent** screen models — no shared root state. Terrestrial and Celestial are static coordinate geometry (`step()` is a no-op). Only Seasons advances time while playing.

| Screen | Model | Notes |
|---|---|---|
| **Terrestrial** | `TerrestrialModel` | λ/φ on flat map + globe; overlay toggles for meridians, tropics, cities, date line |
| **Celestial** | `CelestialModel` | α/δ on flat sky map + celestial sphere; one shared guide star across both views; bright-star catalog + optional zodiac figures |
| **Seasons** | `SeasonsModel` | Canonical state is `sunEclipticLongitudeProperty` (0° = March equinox); derived δ☉, α☉, noon altitude, calendar strings via `SunPosition.ts`; composes `TimeModel` |

**Shared gotchas**

- Seasons physics: `sin δ☉ = sin ε · sin λ☉` with fixed **ε = 23.4°**; animation ≈ **5 simulated days per real second** at normal speed.
- `SkyCoordinates` alt-az helpers are tested and reserved for sibling sims; unused on Terrestrial/Celestial here.
- Default earth map resolution is **`high`** (Natural Earth); overridable via Preferences and `?earthMapResolution=`.
- Sphere paint order follows RotatingSky: back layer (dashed far side) → opaque fills → front layer → stars last.

## Accessibility

Follows the shared [OpenPhysics accessibility convention](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).
Each screen registers its own `*ScreenSummaryContent` (live `currentDetailsContent` over model state) via the view's `screenSummaryContent` super-option, and orders the PDOM through a wrapper `Node`. A11y strings live under `a11y.terrestrial`, `a11y.celestial`, and `a11y.seasons` in each locale JSON, via `StringManager.getTerrestrialA11yStrings()` / `getCelestialA11yStrings()` / `getSeasonsA11yStrings()`.

## Testing

Fleet-standard Vitest layout:

| Path | Purpose |
|---|---|
| `vitest.config.ts` | Test environment + `setupFiles`; `execArgv: ["--expose-gc"]` with memory-leak suite |
| `tests/setup.ts` | Canvas / AudioContext mocks + `init({ name: "…" })` before SceneryStack imports |
| `tests/**/*.test.ts` | Model/physics unit tests |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression (fleet pattern) |

| File | Covers |
|---|---|
| `SunPosition.test.ts` | Cardinal δ☉/α☉, noon altitude, day↔λ☉, calendar |
| `SkyCoordinates.test.ts` | RA/Dec vectors, alt-az round-trips |
| `skyGraphics.test.ts` | Projection helpers |
| `formatAngles.test.ts` | DMS formatting |
| `TerrestrialModel.test.ts`, `CelestialModel.test.ts`, `SeasonsModel.test.ts` | Defaults, reset, stepping |
| `TimeModel.test.ts` | Play/pause elapsed time |
| `memory-leak.test.ts` | `TimeModel` dispose + GC |

- Put unit tests only under root `tests/` (never co-locate or use `__tests__/`).
- Run `npm test`. CI runs the suite when a `test` script is present.

## Commands

```bash
npm run lint && npm run check && npm run build && npm test
```

## Development notes

- **`npm run decompile`** extracts NAAP Flash ActionScript via JPEXS FFDec into gitignored `NAAP/decompiled/` — read-only reference; transcribe maths into typed TS in `src/`.
- Screens are independent; see [doc/multi-screen.md](doc/multi-screen.md) for the fleet multi-screen pattern.
- After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
