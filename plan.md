# Porting Plan — Basic Coordinates and Seasons (NAAP motion1)

## Context

This repo (`/home/veillette/OpenPhysics/BasicCoordinatesAndSeasons`) is a **three-screen SceneryStack scaffold with no physics yet** — each screen shows a placeholder label and a Reset All button. The goal is to port the NAAP Flash lab **"Basic Coordinates and Seasons"** (astroUNL `naap/motion1`) into it, reusing as much as possible from the completed sibling port **`/home/veillette/OpenPhysics/RotatingSky`** (the motion2 lab), which already contains a production-quality celestial-sphere engine (`SkyProjection`, `SkyCoordinates`, `skyGraphics`, Earth globe/flat map with TypeScript coastline data, editable readouts, camera interaction).

This plan is written to be executed step-by-step by a junior developer or a less capable model: every step names exact files, exact copy sources, and a check to run before moving on. **Read the "Conventions and gotchas" section before writing any code.**

### The three screens and their Flash originals

| Screen | Port of (published SWF) | Dev source (decompile target) | Canvas |
|---|---|---|---|
| 1. Terrestrial Coordinates (`src/terrestrial/`) | `NAAP/astroUNL/naap/motion1/animations/tc_flat.swf` + `tc_globe.swf` | `NAAP/flash-animations/flashdev2/mapExplorer/mapExplorer010.swf`, `.../longLatDemo/longLatDemo014.swf` | 850×580, 650×400 |
| 2. Celestial Coordinates (`src/celestial/`) | `.../animations/cec_flat.swf` + `cec_sky.swf` | `.../simpleFlatSkyMap/simpleFlatSkyMap007.swf`, `.../skyMap/skyMap028.swf` | 850×580, 850×560 |
| 3. Seasons (`src/seasons/`) | `.../animations/seasons_ecliptic.swf` | `.../eclipticSimulator/eclipticSimulator025.swf` | 970×710 |

(All `NAAP/...` paths are relative to the repo root, i.e. `/home/veillette/OpenPhysics/BasicCoordinatesAndSeasons/NAAP/...`.)

### Governing physics (already specified in `doc/model.md`)

- Sun's declination through the year: **sin δ☉ = sin ε · sin λ☉**, obliquity ε = 23.4° (fixed).
- Noon solar altitude at latitude φ: **h = 90° − |φ − δ☉|**.
- Circular orbit; one full orbit = one year. No equation of time, precession, refraction.

### Primary references (read before coding each phase)

| Reference | Path | What it gives you |
|---|---|---|
| Lab landing page | `NAAP/astroUNL/naap/motion1/motion1.html` | Lab overview, section links |
| Terrestrial pages | `NAAP/astroUNL/naap/motion1/tc_units.html`, `tc_finding.html`, `tc_both.html` | Pedagogy + which SWF does what |
| Celestial pages | `NAAP/astroUNL/naap/motion1/cec_units.html`, `cec_both.html` | RA/Dec teaching text |
| Seasons pages | `NAAP/astroUNL/naap/motion1/orbits_light.html`, `animations/seasons_ecliptic.html` | Ecliptic/obliquity teaching text |
| **Student guide (richest control descriptions)** | `NAAP/astroUNL/naap/motion1/naap_motion1_sg.pdf` | Per-explorer control lists and screenshots — read with the Read tool (PDF pages) |
| Decompiled AS (after Phase 0) | `NAAP/decompiled/<name>/scripts/` | The original math + control wiring |
| Decompile example (already present) | `NAAP/decompiled/celHorComp039-D/scripts/` | Shows the decompiled-output layout |
| **Modern JS math reference** | `NAAP/astro-simulations/sun-motion-simulator/src/utils.js` | Unit-tested JS sun-position math ("values from the original actionscript source") |
| Modern JS sphere reference | `NAAP/astro-simulations/sun-motion-simulator/src/CelestialSphere.jsx` | How UNL's own JS port draws sun + ecliptic |
| Poster screenshots of the five explorers | `NAAP/naap-air-app/files/motion1/animations/{tc_flat,tc_globe,cec_flat,cec_sky,seasons_ecliptic}.jpg` | What each explorer looks like (Flash won't run) |
| Sim physics spec | `doc/model.md` (this repo) | Target equations, ranges, simplifications |
| Sim architecture notes | `doc/implementation-notes.md`, `CLAUDE.md` (this repo) | Conventions, porting map |

### How to read the decompiled ActionScript (pattern from `celHorComp039-D`)

- `scripts/%3Cdefault package%3E/*.as` — the "classes". Geometry/math lives in numbered prototype-extension files (e.g. `3 CS Geometry.as` defines `p.screenToCelestial = function(...)`). Constants `57.29577951308232` = 180/π (rad→deg) and `3.819718634205488` = 12/π (rad→hours).
- `scripts/DefineSprite_<id>[_name]/frame_1/DoAction*.as` — timeline control wiring. The main app sprite's `DoAction.as` typically contains an `onReset()` that enumerates **every UI control with its default value** — transcribe that list to get each explorer's exact control inventory.
- Decompiled AS is a **read-only reference**: transcribe the math into typed TS; never vendor/copy the AS itself.

---

## Conventions and gotchas (apply to every step)

1. **Imports**: everything from `scenerystack/<subpath>` (`scenerystack/sim`, `/scenery`, `/axon`, `/sun`, `/scenery-phet`, `/joist`, `/tandem`, `/phet-core`, `/chipper`). Local imports use `.js` extension on `.ts` files (e.g. `import { TimeModel } from "../common/TimeModel.js"`). No vite aliases exist.
2. **Prefixes** (from `CLAUDE.md`): sim-specific shared code keeps the `BasicCoordinatesAndSeasons` prefix; per-screen code uses `Terrestrial` / `Celestial` / `Seasons`. Generic astronomy engine files copied from RotatingSky (`SkyProjection`, `SkyCoordinates`, `skyGraphics`, …) keep their generic names — they are domain utilities, not sim-branded classes.
3. **Strict tsconfig**: `noUncheckedIndexedAccess` (array indexing returns `T | undefined` — guard it), `exactOptionalPropertyTypes` (don't assign `undefined` to optional props), `verbatimModuleSyntax` (use `import type` for types), `noUnusedLocals/Parameters` (prefix unused params with `_`).
4. **Colors** go in `src/BasicCoordinatesAndSeasonsColors.ts` as `ProfileColorProperty` with `default` (dark) + `projector` (light) values. **Numeric constants** go in `src/BasicCoordinatesAndSeasonsConstants.ts` (SI/degrees for physics, px for layout). Panels use `src/common/BasicCoordinatesAndSeasonsPanel.ts`; buttons spread the `FLAT_*` bundles from `src/common/BasicCoordinatesAndSeasonsButtonOptions.ts`.
5. **a11y**: every interactive node gets `accessibleName` (a StringProperty from `StringManager`); each screen's `currentDetailsContent` must become a live `PatternStringProperty` over model Properties; keep `pdomOrder` updated in each ScreenView (set on the wrapper Node / `pdomPlayAreaNode`, never on the ScreenView itself).
6. **i18n**: `src/i18n/strings_en.json`, `strings_es.json`, `strings_fr.json` must keep **identical key trees** (compile-time `satisfies` check in `StringManager.ts` fails otherwise). Add keys to all three at once, with real Spanish/French translations of astronomy terms.
7. **Gate after every phase** (and ideally every few steps): `npm run check && npm run lint && npm run build && npm test`. Run `npm run fix` to auto-fix lint issues.
8. **Paint order for sphere scenes** (RotatingSky pattern): add `sphereNode.backLayer` (dashed far side) → opaque globe/fills → `*.frontLayer` (solid near side) → stars/markers last.
9. Commit at the end of each phase with a descriptive message (`feat: ...`).
10. RotatingSky files are **copied**, not imported across repos — each OpenPhysics sim is standalone with `scenerystack` as its only runtime dependency.

---

## Phase 0 — Setup, decompile, and reference reading

**Step 0.1 — Verify Java, set up FFDec.**
Run `java -version`. If missing: `sudo apt install default-jre`. Then `npm run decompile -- --setup` (downloads JPEXS FFDec into `tools/ffdec/`).
*Check*: `ls tools/ffdec/ffdec.jar` exists.

**Step 0.2 — Decompile the five explorers.**
Run `npm run decompile` (targets: `mapExplorer010`, `longLatDemo014`, `simpleFlatSkyMap007`, `skyMap028`, `eclipticSimulator025`).
*Check*: `NAAP/decompiled/` now contains those five directories, each with `scripts/` full of `.as` files.
*Fallback if Java/FFDec is impossible*: continue anyway — the physics is fully specified in `doc/model.md` and `NAAP/astro-simulations/sun-motion-simulator/src/utils.js`; use the student-guide PDF and poster JPEGs for UI inventory, and mark decompile-verification steps as skipped in commit messages.

**Step 0.3 — Extract each explorer's control inventory.**
For each of the five decompiled dirs, find the main sprite's `frame_1/DoAction*.as` containing `onReset` / control-default assignments (grep for `onReset`, `setValue`, `setSelectedIndex` under `NAAP/decompiled/<name>/scripts/`). Write the findings into a new reference file `doc/naap-control-inventory.md`: one section per explorer listing every control, its type (slider/checkbox/radio/combo/draggable), and its default. This document drives the UI work in Phases 2–5.
*Check*: `doc/naap-control-inventory.md` has five sections, each with a control table and citations of the exact `.as` file paths used.

**Step 0.4 — Read the student guide and lab pages.**
Read `NAAP/astroUNL/naap/motion1/naap_motion1_sg.pdf` (Read tool with `pages`), plus the six lab HTML pages listed in the reference table. Append per-explorer behavioral notes (what drags, what the readouts show, units/formatting) to `doc/naap-control-inventory.md`.

**Step 0.5 — Save this plan into the repo** as `doc/porting-plan.md` (so later sessions can follow it), and commit Phase 0 (`docs: NAAP control inventory + porting plan`).

---

## Phase 1 — Shared foundation (copy the sky engine from RotatingSky)

All copy sources are under `/home/veillette/OpenPhysics/RotatingSky/`. After copying each file, apply the **rename recipe**:
- Replace identifier + import `RotatingSkyColors` → `BasicCoordinatesAndSeasonsColors`, `RotatingSkyConstants` → `BasicCoordinatesAndSeasonsConstants`, `RotatingSkyNamespace` → `BasicCoordinatesAndSeasonsNamespace`, `RotatingSkyPanel` → `BasicCoordinatesAndSeasonsPanel`, `rotatingSky` → `basicCoordinatesAndSeasons` (query params), and fix relative import paths.
- If the copied file references a color/constant/string that doesn't exist here yet, **add it** (Step 1.2/1.3) rather than deleting the reference — unless the feature is out of scope (noted per file below).

**Step 1.1 — Copy the pure-math and projection core.**

| Copy from (RotatingSky) | To (this repo) | Notes |
|---|---|---|
| `src/common/SkyCoordinates.ts` | `src/common/SkyCoordinates.ts` | Pure math, no deps — copy verbatim |
| `src/common/SkyProjection.ts` | `src/common/SkyProjection.ts` | Orthographic 3D→2D projector |
| `src/common/view/skyGraphics.ts` | `src/common/view/skyGraphics.ts` | Circle/polyline projection helpers |
| `src/common/view/starGraphics.ts` | `src/common/view/starGraphics.ts` | Star shape factory |
| `tests/SkyCoordinates.test.ts` | `tests/SkyCoordinates.test.ts` | Adjust import paths only |
| `tests/skyGraphics.test.ts` | `tests/skyGraphics.test.ts` | Adjust import paths only |

*Check*: `npm run check && npm test` — the two copied test suites pass.

**Step 1.2 — Extend colors.**
Open `/home/veillette/OpenPhysics/RotatingSky/src/RotatingSkyColors.ts` and copy into `src/BasicCoordinatesAndSeasonsColors.ts` (same `ProfileColorProperty` pattern, keep this sim's namespace) every color the copied view files need — at minimum: `celestialEquatorColorProperty`, `eclipticColorProperty`, `gridColorProperty`, `sphereOutlineColorProperty`, `starColorProperty`, `selectedStarColorProperty`, `guideRaColorProperty`, `guideDecColorProperty`, `earthLandColorProperty`, `earthOceanColorProperty`, `observerColorProperty`. Add **new** colors for this sim: `sunColorProperty` (default `#ffd54f` / projector `#f9a825`), `orbitPathColorProperty`, `terminatorShadeColorProperty`, `sunbeamColorProperty` (pick sensible dark/light pairs).
*Check*: `npm run check` passes; no copied file still imports `RotatingSkyColors`.

**Step 1.3 — Extend constants.**
Add to `src/BasicCoordinatesAndSeasonsConstants.ts` (copy values from `/home/veillette/OpenPhysics/RotatingSky/src/RotatingSkyConstants.ts` where they exist there): `SPHERE_RADIUS = 170`, `STAR_RADIUS = 5`, `LATITUDE_RANGE = new Range(-90, 90)`, `LONGITUDE_RANGE = new Range(-180, 180)`, `DEFAULT_LATITUDE = 40.8`, `DEFAULT_LONGITUDE = -96.7` (NAAP's Lincoln, NE default — verify against the decompiled `onReset` in Step 0.3 and adjust), plus new physics constants: `OBLIQUITY_DEGREES = 23.4`, `DAYS_PER_YEAR = 365.24`, `SEASONS_ANIMATION_DAYS_PER_SECOND` (start with 15; tune in Phase 5 against the original's pace).

**Step 1.4 — Copy the Earth/map view stack.**

| Copy from (RotatingSky) | To | Notes |
|---|---|---|
| `src/common/model/EarthShoreData.ts` | `src/common/model/EarthShoreData.ts` | Resolution selector |
| `src/common/model/EarthShoreDataLow.ts` | `src/common/model/EarthShoreDataLow.ts` | NAAP coastline polygons (verbatim) |
| `src/common/model/EarthShoreDataHigh.ts` | `src/common/model/EarthShoreDataHigh.ts` | Natural Earth polygons (verbatim, 5233 lines) |
| `src/common/view/EarthGlobeNode.ts` | `src/common/view/EarthGlobeNode.ts` | **Edit**: the globe is drawn at a hardcoded `0.28 × projection.radius`; add a `radiusRatio?: number` option (default 0.28) so the Terrestrial screen can render a full-size globe (`radiusRatio: 1`). Keep `siderealTimeProperty` param but Terrestrial will pass a constant `NumberProperty(0)`. |
| `src/common/view/FlatEarthMapNode.ts` | `src/common/view/FlatEarthMapNode.ts` | Equirectangular map + draggable observer cursor (sets lat/long Properties) |
| `src/common/view/skyViewLayout.ts` | `src/common/view/skyViewLayout.ts` | Projection/readout layout helpers |

If these files pull in RotatingSky's `earthMapResolutionProperty` preference, add the same preference here: extend `src/preferences/basicCoordinatesAndSeasonsQueryParameters.ts` + `BasicCoordinatesAndSeasonsPreferencesModel/Node` following RotatingSky's `src/preferences/rotatingSkyQueryParameters.ts` pattern (replace the placeholder `exampleToggle`).

**Step 1.5 — Copy the sphere/readout/interaction view stack.**

| Copy from (RotatingSky) | To | Notes |
|---|---|---|
| `src/common/view/CelestialSphereNode.ts` | `src/common/view/CelestialSphereNode.ts` | **Edit**: add `eclipticVisibleProperty?: TReadOnlyProperty<boolean>` option (the ecliptic is currently always drawn); keep `ECLIPTIC_POLE = raDecToVector3(18, 66.56)` |
| `src/common/view/CoordinateGuideNode.ts` | `src/common/view/CoordinateGuideNode.ts` | Draggable guide star + RA/Dec circles — the Celestial screen's star |
| `src/common/view/EditableNumberFieldNode.ts` | `src/common/view/EditableNumberFieldNode.ts` | Label + type-in numeric field |
| `src/common/view/SkyReadoutNode.ts` | `src/common/view/SkyReadoutNode.ts` | RA/Dec (or Alt/Az) paired fields. If it depends on RotatingSky's `SkyModel`, refactor its constructor to take plain `{ raProperty, decProperty }` Properties instead (this sim has no `SkyModel`). |
| `src/common/view/attachSkyCameraInteraction.ts` | `src/common/view/attachSkyCameraInteraction.ts` | **Edit**: drop the `sky: SkyModel` dependency and the Ctrl-drag sidereal-time mode + Shift-click add-star mode (not needed here); keep free-rotate drag + arrow keys + a11y focus wiring. |
| `src/common/RotatingSkyControlOptions.ts` | `src/common/BasicCoordinatesAndSeasonsControlOptions.ts` | Rename exported consts `ROTATING_SKY_*` → `SIM_*` (matches existing `SIM_COMBO_BOX_OPTIONS` naming) |

Strings these nodes reference: RotatingSky exposes a top-level `controls` JSON section via `StringManager.getControls()`. Mirror that: add a `controls: {}` object to all three `strings_*.json` and a `getControls()` getter in `src/i18n/StringManager.ts`; then add each key the copied nodes need (copy the English values from `/home/veillette/OpenPhysics/RotatingSky/src/i18n/strings_en.json`).

*Check (end of Phase 1)*: full gate passes; nothing in `src/` references the string "RotatingSky"; screens still launch (`npm start`, all three placeholders render).

**Step 1.6 — New pure-math module `src/common/SunPosition.ts`.**
This is the heart of the sim's new physics (equations from `doc/model.md`; cross-check numerically against `NAAP/astro-simulations/sun-motion-simulator/src/utils.js` `getPosition(day)`):

```ts
// All angles in degrees, RA in hours, using degToRad/radToDeg/normalizeDegrees/normalizeHours from SkyCoordinates.js

/** sin δ☉ = sin ε · sin λ☉ */
export function sunDeclinationDeg(sunEclipticLongitudeDeg: number, obliquityDeg = OBLIQUITY_DEGREES): number;

/** α☉ = atan2( sin λ☉ · cos ε, cos λ☉ ), normalized to [0, 24) hours */
export function sunRightAscensionHours(sunEclipticLongitudeDeg: number, obliquityDeg = OBLIQUITY_DEGREES): number;

/** h = 90° − |φ − δ☉| */
export function noonSunAltitudeDeg(latitudeDeg: number, sunDeclinationDeg: number): number;

/** Circular orbit: λ☉ = 360 · (dayOfYear − MARCH_EQUINOX_DAY) / DAYS_PER_YEAR, normalized to [0, 360). MARCH_EQUINOX_DAY ≈ 79.25 (Mar 20). */
export function eclipticLongitudeForDayOfYear(dayOfYear: number): number;
export function dayOfYearForEclipticLongitude(lambdaDeg: number): number;  // inverse

/** dayOfYear (1..365) → { monthIndex 0-11, dayOfMonth 1-31 } for the date readout (non-leap year) */
export function monthAndDayForDayOfYear(dayOfYear: number): { monthIndex: number; dayOfMonth: number };
```

**Step 1.7 — Tests for `SunPosition`** in `tests/SunPosition.test.ts` (imitate the style of `tests/SkyCoordinates.test.ts`; use `toBeCloseTo(v, 6)`). Pin at minimum:
- λ☉ = 0° (March equinox) → δ☉ = 0, α☉ = 0 h; λ☉ = 90° (June solstice) → δ☉ = +23.4, α☉ = 6 h; λ☉ = 180° → δ☉ = 0, α☉ = 12 h; λ☉ = 270° → δ☉ = −23.4, α☉ = 18 h.
- Noon altitude: φ = 40°, δ☉ = +23.4° → 73.4°; φ = 40°, δ☉ = 0 → 50°; φ = 90°, δ☉ = −23.4° → −23.4° (polar night).
- `dayOfYearForEclipticLongitude(eclipticLongitudeForDayOfYear(d)) ≈ d` round-trip for several d; δ☉ maximal at λ☉ = 90° (compare neighbors).

*Check*: gate passes. Commit Phase 1 (`feat: shared sky engine ported from RotatingSky + sun-position math`).

---

## Phase 2 — Terrestrial Coordinates screen

Port of the **Flat Map Explorer** (`mapExplorer010`) and **Globe Explorer** (`longLatDemo014`) side-by-side, sharing one lat/long. UI truth source: `doc/naap-control-inventory.md` §mapExplorer + §longLatDemo (from Step 0.3) and the posters `NAAP/naap-air-app/files/motion1/animations/tc_flat.jpg` / `tc_globe.jpg`.

**Step 2.1 — Model** (`src/terrestrial/model/TerrestrialModel.ts`):
- `latitudeProperty = new NumberProperty(DEFAULT_LATITUDE, { range: LATITUDE_RANGE, units: "°" })`
- `longitudeProperty = new NumberProperty(DEFAULT_LONGITUDE, { range: LONGITUDE_RANGE, units: "°" })`
- Visibility toggles per the decompiled control inventory (expect roughly: `referenceParallelsVisibleProperty` for equator/tropics/polar circles, `gridVisibleProperty`; adjust names to what the inventory actually shows).
- `reset()` resets all Properties. `step()` stays a no-op.
- Unit test `tests/TerrestrialModel.test.ts`: defaults, range clamping, reset.

**Step 2.2 — Flat map (left half)**: instantiate the copied `FlatEarthMapNode` bound to the two Properties (drag cursor updates them). Size ≈ 470×235 px placed in the left half of the 1024×618 layoutBounds. If NAAP's map explorer draws reference parallels (tropics at ±23.4°, polar circles at ±66.6°, equator), add them as horizontal lines inside a small subclass or wrapper node `src/terrestrial/view/TerrestrialMapNode.ts` rather than editing the shared `FlatEarthMapNode`.

**Step 2.3 — Globe (right half)**: `new SkyProjection({ center, radius: ~180, elevation: -0.35 })` + `EarthGlobeNode(projection, latitudeProperty, longitudeProperty, new NumberProperty(0), earthMapResolutionProperty, { radiusRatio: 1 })`. Wire `attachSkyCameraInteraction` on the globe area so dragging rotates the globe. Add a new node `src/terrestrial/view/GlobeObserverDragNode.ts`: a marker at the observer's lat/long that can be dragged — on drag, `projection.unproject(point)` → convert the unit vector to lat/long (latitude = asin(z), longitude from atan2 minus current globe spin) → set the two Properties; ignore drags that resolve to the back hemisphere (`isFrontFacing` false).

**Step 2.4 — Readout/control panel** (bottom or right edge, using `BasicCoordinatesAndSeasonsPanel`): two `EditableNumberFieldNode`s ("Longitude" ° E/W, "Latitude" ° N/S — NAAP displays hemisphere letters; format via a small helper `formatLongitude(deg)` / `formatLatitude(deg)` in `src/common/formatAngles.ts` with unit tests), plus checkboxes for the visibility toggles from Step 2.1. Every control gets `accessibleName` from new `a11y.terrestrial.controls.*` / `controls.*` strings.

**Step 2.5 — ScreenView assembly** (`src/terrestrial/view/TerrestrialScreenView.ts`): remove the placeholder `Text`; add map, globe, panel; set `pdomOrder` (map cursor, globe, fields, checkboxes, reset). Model the structure on `/home/veillette/OpenPhysics/RotatingSky/src/celestial-sphere/view/CelestialSphereScreenView.ts`.

**Step 2.6 — a11y/i18n**: update `a11y.terrestrial.screenSummary.*`; make `currentDetailsContent` in `TerrestrialScreenSummaryContent.ts` a live `PatternStringProperty` (e.g. "The observer is at {{latitude}} and {{longitude}}.") over the two Properties. Add all new keys to `strings_en/es/fr.json`.

*Check (end of Phase 2)*: gate passes; `npm start` → screen 1 shows synced map+globe: dragging the map cursor moves the globe marker and updates both fields; typing a longitude pans the globe marker. Compare behavior against `tc_flat.jpg`/`tc_globe.jpg` and the student guide's terrestrial section. Commit.

---

## Phase 3 — Celestial Coordinates screen

Port of the **Flat Sky Map** (`simpleFlatSkyMap007` — "now with zodiac constellations") and the **Sky Explorer sphere** (`skyMap028`), sharing one star position. UI truth source: `doc/naap-control-inventory.md` §simpleFlatSkyMap + §skyMap, posters `cec_flat.jpg` / `cec_sky.jpg`, teaching text in `NAAP/astroUNL/naap/motion1/cec_units.html`.

**Step 3.1 — Model** (`src/celestial/model/CelestialModel.ts`):
- `starRaProperty = new NumberProperty(6, { range: new Range(0, 24), units: "h" })` (verify NAAP's default from the decompiled `onReset`)
- `starDecProperty = new NumberProperty(30, { range: new Range(-90, 90), units: "°" })`
- Toggles per inventory (expect: `constellationsVisibleProperty`, maybe grid/label toggles).
- Unit test `tests/CelestialModel.test.ts`: defaults, clamping, reset.

**Step 3.2 — Zodiac constellation data** (`src/celestial/model/ZodiacConstellations.ts`): same shape as `/home/veillette/OpenPhysics/RotatingSky/src/common/model/StarPatterns.ts` (`{ raHours, decDeg }` stars + `[i, j]` edges). Source options, in order of preference: (a) transcribe coordinates from the decompiled `simpleFlatSkyMap007` data (grep the decompiled scripts for numeric star arrays); (b) hand-author the 13 zodiac constellations (Aries…Pisces + Ophiuchus if NAAP includes it — check the poster) from a public bright-star catalog, ~4–8 stars each, J2000, 0.1 h / 1° precision is plenty at this scale. **Fallback**: ship first with constellations omitted and the toggle hidden; add data in a follow-up step — do not let this block the screen.

**Step 3.3 — Flat sky map** (new `src/celestial/view/FlatSkyMapNode.ts`): a bordered rectangle mapping RA (x) × Dec (y). **RA increases to the left** (0 h at the right edge — standard star-chart convention; verify against `cec_flat.jpg`), Dec +90 top → −90 bottom. Draw: grid lines (every 1–2 h and 10–30°, per the poster), axis labels ("Right Ascension (h)", "Declination (°)"), zodiac stick figures from Step 3.2, and a draggable star marker (use `createStarShape` from `src/common/view/starGraphics.ts`) bound to the two model Properties. Linear mapping both ways — no projection needed. Make the star keyboard-draggable (arrow keys nudge RA/Dec) with an `accessibleName`.

**Step 3.4 — Celestial sphere (right half)**: `SkyProjection({ radius: ~SPHERE_RADIUS, elevation: -0.35 })` + `CelestialSphereNode(projection, { gridVisibleProperty, ... })` + the copied `CoordinateGuideNode` bound to `starRaProperty`/`starDecProperty` (this gives the draggable star with its RA hour-circle and Dec-circle guides — exactly NAAP's visualization) + zodiac stick figures on the sphere too if inventory shows them (project each edge with `greatCircleArcPoints` + `projectSplitPolyline` from `skyGraphics.ts`). Camera drag via `attachSkyCameraInteraction`.

**Step 3.5 — Readout panel**: `SkyReadoutNode`/two `EditableNumberFieldNode`s for RA (hours, 1 decimal) and Dec (degrees, 1 decimal) — type-in sets the star on both views. Toggle checkboxes per inventory.

**Step 3.6 — ScreenView assembly + a11y**: same recipe as Steps 2.5–2.6. `currentDetailsContent`: "The star is at right ascension {{ra}} hours and declination {{dec}} degrees."

*Check (end of Phase 3)*: gate passes; dragging the star on the flat map moves it on the sphere (and vice versa); readout fields round-trip. δ = +66.56° star should sit near the ecliptic pole visual. Commit.

---

## Phase 4 — Seasons model

Port of the **Seasons and Ecliptic Simulator** state. Truth source: `doc/naap-control-inventory.md` §eclipticSimulator (the decompiled `onReset` catalog is essential here — this is the most control-rich explorer) and the student guide's seasons section.

**Step 4.1 — `src/seasons/model/SeasonsModel.ts`:**
- `timer = new TimeModel()` (from `src/common/TimeModel.ts`) — bind play/pause; keep `timeProperty` unused or drive day from it.
- `sunEclipticLongitudeProperty = new NumberProperty(0, { range: new Range(0, 360), units: "°" })` — **canonical state** (0 = March equinox). Day-of-year is derived, not stored.
- `latitudeProperty = new NumberProperty(DEFAULT_LATITUDE, { range: LATITUDE_RANGE, units: "°" })` — the observer whose noon altitude is shown.
- Derived (all `DerivedProperty` over the above, using `SunPosition.ts`): `sunDeclinationProperty`, `sunRightAscensionProperty`, `noonSunAltitudeProperty` (from latitude + declination), `dayOfYearProperty`, `monthDayProperty` (for the date readout).
- Visibility toggles per the decompiled inventory (expect items like ecliptic/celestial-equator toggles, labels, sunbeam options — use the inventory's names/defaults).
- `step(dt)`: if `timer.isPlayingProperty`, advance `sunEclipticLongitudeProperty` by `360 / DAYS_PER_YEAR × SEASONS_ANIMATION_DAYS_PER_SECOND × dt`, wrapping at 360.
- `reset()`: resets everything including `timer`.

**Step 4.2 — Tests** (`tests/SeasonsModel.test.ts`, imitate `/home/veillette/OpenPhysics/RotatingSky/tests/SkyModel.test.ts` style): derived δ☉/α☉ at the four cardinal λ☉ values; noon altitude at φ = 40° for solstices/equinoxes (73.4° / 50° / 26.6°); no advance while paused; advance + wrap while playing; reset restores defaults.

*Check*: gate passes. Commit (`feat: seasons model with sun-position derivations`).

---

## Phase 5 — Seasons view

The flagship screen (original canvas 970×710 — the busiest layout; study `NAAP/naap-air-app/files/motion1/animations/seasons_ecliptic.jpg` and the student guide pages closely, and reconcile every sub-panel against `doc/naap-control-inventory.md` before building). Build it as four composable nodes + a control strip; get each node working before the next.

**Step 5.1 — Orbit view** (`src/seasons/view/OrbitViewNode.ts`, new): Sun at center (filled circle, `sunColorProperty`), Earth on a circular orbit path (`orbitPathColorProperty`), viewed from slightly above the ecliptic plane (draw the orbit as an ellipse with, e.g., 0.35 vertical foreshortening — match the poster). Earth's angular position = `sunEclipticLongitudeProperty` + 180° (Earth's heliocentric longitude is opposite the Sun's geocentric one — verify sign against the original: at the June solstice the Earth is at the position where the N pole tilts sunward). Month/solstice/equinox labels around the orbit. **Earth is draggable along the orbit** (DragListener → atan2 of pointer around center → set `sunEclipticLongitudeProperty`; also arrow-key nudgeable with `accessibleName`). Draw Earth's tilted axis (fixed direction in space as it orbits — the key pedagogy).

**Step 5.2 — Celestial sphere with Sun on the ecliptic** (`src/seasons/view/SeasonsSphereNode.ts`, new, thin composition): `SkyProjection` + copied `CelestialSphereNode` (equator + ecliptic visible) + a new small `SunMarkerNode` (`src/seasons/view/SunMarkerNode.ts`): a sun disk at `raDecToVector3(sunRightAscensionProperty.value, sunDeclinationProperty.value)`, redrawn via `Multilink` on `[projection.viewMatrixProperty, sunRightAscensionProperty, sunDeclinationProperty]`, hidden/dimmed when `isFrontFacing` is false. This directly visualizes sin δ☉ = sin ε · sin λ☉ as the Sun rides the tilted ecliptic.

**Step 5.3 — Earth close-up** (`src/seasons/view/EarthCloseUpNode.ts`, new): a plain sphere (NAAP's 025 note: "Land features were removed from the earth in the upper right panel") with: tilted rotation axis (23.4° from orbit normal, orientation fixed in space), equator line, terminator (day/night shading — the night half is the hemisphere facing away from the Sun; shade with `terminatorShadeColorProperty`), subsolar-point marker (latitude = δ☉), and the observer's latitude marked (small stick figure or dot at `latitudeProperty`). Reuse `skyGraphics.ts` helpers (`smallCirclePoints` for equator/latitude circles projected through a dedicated small `SkyProjection`).

**Step 5.4 — Sunbeam / angle-of-incidence panel** (`src/seasons/view/SunbeamSpreadNode.ts`, new): shows a beam of fixed cross-section hitting the ground at the observer's noon sun altitude `h` — ground-footprint width ∝ 1/sin(h) (clamp/hide when h ≤ 0, i.e. polar night). Draw: ground line, incoming parallel rays at angle h, highlighted footprint, and a numeric "beam spread" or intensity readout if the inventory shows one. Teaching text reference: `NAAP/astroUNL/naap/motion1/orbits_light.html`.

**Step 5.5 — Controls + readouts strip**: `TimeControlNode` bound to `model.timer.isPlayingProperty` (spread `FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS`); latitude `NumberControl` (options from `BasicCoordinatesAndSeasonsControlOptions.ts`); date readout (`monthDayProperty` via `PatternStringProperty`, month names from a new `controls.months.*` string set — localized!); numeric readouts for λ☉, δ☉, α☉, and noon altitude h. Checkboxes per inventory. All in `BasicCoordinatesAndSeasonsPanel`s.

**Step 5.6 — ScreenView assembly** (`src/seasons/view/SeasonsScreenView.ts`): lay the four panels out in the 1024×618 bounds roughly matching the original's arrangement (orbit view largest, left; sphere and earth close-up right; sunbeam + controls bottom — adjust to the poster). `model.step(dt)` is already called by the framework via `Screen`; make sure `SeasonsScreenView.step` stays a stub. Set full `pdomOrder`.

**Step 5.7 — a11y**: `currentDetailsContent` as a live pattern, e.g. "It is {{month}} {{day}}. The Sun's declination is {{dec}} degrees; at latitude {{latitude}} degrees the noon Sun altitude is {{altitude}} degrees." Add `accessibleName` + help text for the draggable Earth and every control.

*Check (end of Phase 5)*: gate passes; playing animates Earth around the orbit with date/declination/altitude readouts moving in lockstep; dragging Earth to the June-solstice position shows δ☉ = +23.4°, subsolar point on the Tropic of Cancer, longest beam concentration at φ = 40°N. Cross-check several dates against the original values in `doc/naap-control-inventory.md`. Commit.

---

## Phase 6 — Polish: icons, docs, cleanup

- **Step 6.1** Screen icons: follow `/home/veillette/OpenPhysics/RotatingSky/src/common/RotatingSkyScreenIcons.ts` → `src/common/BasicCoordinatesAndSeasonsScreenIcons.ts` (programmatic 548×373 `ScreenIcon`s: e.g. mini globe / mini sphere with star / mini orbit); wire `homeScreenIcon` in each `<Prefix>Screen.ts`. Optionally replace `public/icons/icon.svg` and run `npm run icons`.
- **Step 6.2** Keyboard help: extend each `<Prefix>KeyboardHelpContent.ts` with sections for the screen's drag/arrow-key interactions (see RotatingSky's keyboard-help + `RotatingSkyHotkeyData.ts` pattern if hotkeys were copied).
- **Step 6.3** Fix `tests/setup.ts`: `name: "simTemplate"` → `"basic-coordinates-and-seasons"` (leftover template value).
- **Step 6.4** Update `doc/implementation-notes.md` (remove "placeholder" status, document the new common modules) and `README.md` status section; note in `doc/model.md` anything the decompile revealed that refines the model.
- **Step 6.5** Sweep: every interactive node has `accessibleName`; all three locale JSONs still key-parity (the `satisfies` check enforces it); no unused placeholder strings (`exampleControl`, `exampleToggle`) left unless still referenced.

---

## Phase 7 — Verification

1. **Gate**: `npm run check && npm run lint && npm run build && npm test` — all green.
2. **Behavioral pass with the dev server** (`npm start`, then drive with the Playwright browser tools — navigate to the printed localhost URL, screenshot each screen):
   - Screen 1: map-cursor drag ↔ globe marker ↔ typed fields all stay in sync; hemisphere letters correct (40.8° N, 96.7° W).
   - Screen 2: star drag on flat map ↔ sphere guide star ↔ RA/Dec fields in sync; RA axis direction matches `cec_flat.jpg`.
   - Screen 3: the four cardinal dates give exactly δ☉ = 0 / +23.4 / 0 / −23.4 and noon altitudes 50 / 73.4 / 50 / 26.6 at φ = 40°; animation pace feels like the original; Reset All restores everything on all screens.
3. **Fidelity pass**: side-by-side with the poster JPEGs and student guide screenshots; every control in `doc/naap-control-inventory.md` is either implemented or consciously recorded there as dropped (with a one-line reason).
4. Projector mode (Preferences → Visual) renders legibly on every screen; keyboard-only traversal reaches every interactive element.

---

## Risks and open questions (resolve during execution, don't guess silently)

| Risk | Resolution path |
|---|---|
| Exact eclipticSimulator panel inventory unknown until decompiled | Step 0.3 + student guide; keep Phase 5 nodes composable so panels can be added/dropped |
| Zodiac star data may be hard to extract from the SWF | Step 3.2 fallback ladder (decompile → hand-author → ship without) |
| NAAP default location / star defaults | Read them from each decompiled `onReset`; constants in Step 1.3/3.1 are provisional |
| `SkyReadoutNode`/`attachSkyCameraInteraction` are coupled to RotatingSky's `SkyModel` | Refactor to plain Property params during the copy (Steps 1.5); keep the diff minimal |
| Earth-orbit geometry sign conventions (Earth's position vs λ☉, axis direction) | Pin with the June-solstice check in Step 5.1/Phase 7 before polishing |
| Animation rate mismatch vs original | Tune `SEASONS_ANIMATION_DAYS_PER_SECOND` against the original's feel; it's one constant |
