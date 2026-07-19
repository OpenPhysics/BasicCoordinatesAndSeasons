# Implementation Notes - Basic Coordinates and Seasons

Developer-facing notes on the architecture. Educator-facing physics and pedagogy are in
[model.md](./model.md). NAAP Flash control defaults and formula cross-checks live in
[naap-control-inventory.md](./naap-control-inventory.md).

## Architecture Overview

Basic Coordinates and Seasons is a three-screen SceneryStack sim porting the NAAP motion1 lab. A shared
orthographic sky engine (ported from sibling sim **RotatingSky**) drives globe, celestial sphere, and
flat-map views; pure-math modules supply seasons physics and angle utilities.

```
src/main.ts
  ├─ TerrestrialScreen   (Screen<TerrestrialModel, TerrestrialScreenView>)   src/terrestrial/
  ├─ CelestialScreen     (Screen<CelestialModel, CelestialScreenView>)       src/celestial/
  └─ SeasonsScreen       (Screen<SeasonsModel, SeasonsScreenView>)           src/seasons/

Each screen folder:
  <Prefix>Screen.ts                     wires model + view, homeScreenIcon, keyboard help
  model/<Prefix>Model.ts                Property-based state (+ derived quantities)
  view/<Prefix>ScreenView.ts            visuals, screenSummaryContent + pdomOrder
  view/<Prefix>ScreenSummaryContent.ts  live PDOM overview
  view/<Prefix>KeyboardHelpContent.ts   keyboard help dialog

src/common/                              shared sky engine + sim-wide helpers
  ├─ SunPosition.ts                      seasons physics (pure, unit-tested)
  ├─ SkyCoordinates.ts                   spherical astronomy (pure; alt-az API reserved/unused here)
  ├─ SkyProjection.ts                    orthographic 3D→2D projector; dispose()
  ├─ TimeModel.ts                        composable play/pause + elapsed time; dispose()
  ├─ formatAngles.ts                     DMS / decimal formatting
  ├─ view/skyGraphics.ts, starGraphics.ts, skyViewLayout.ts
  ├─ view/CelestialSphereNode.ts, CoordinateGuideNode.ts, EarthGlobeNode.ts, FlatEarthMapNode.ts
  ├─ view/EditableNumberFieldNode.ts, SkyReadoutNode.ts, attachSkyCameraInteraction.ts
  ├─ model/EarthShoreData*.ts            NAAP (low) + Natural Earth (high) coastlines
  ├─ BasicCoordinatesAndSeasonsPanel.ts, *ButtonOptions.ts, *ControlOptions.ts, *HotkeyData.ts
  └─ BasicCoordinatesAndSeasonsScreenIcons.ts

src/preferences/
  ├─ BasicCoordinatesAndSeasonsPreferencesModel   earthMapResolution ("low"/"high")
  ├─ BasicCoordinatesAndSeasonsPreferencesNode
  └─ basicCoordinatesAndSeasonsQueryParameters    ?earthMapResolution=
```

Data flows Model → View through AXON `Property` objects. Generic engine files keep domain names
(`SkyProjection`, `SkyCoordinates`, …) — astronomy utilities, not sim-branded classes.

## Porting map (NAAP → screens)

| Screen | NAAP animation | flashdev2 source (decompile target) |
|---|---|---|
| Terrestrial | `tc_flat.swf` | `mapExplorer/mapExplorer010.swf` |
| Terrestrial | `tc_globe.swf` | `longLatDemo/longLatDemo014.swf` |
| Celestial | `cec_flat.swf` | `simpleFlatSkyMap/simpleFlatSkyMap007.swf` |
| Celestial | `cec_sky.swf` | `skyMap/skyMap028.swf` |
| Seasons | `seasons_ecliptic.swf` | `eclipticSimulator/eclipticSimulator025.swf` |

`npm run decompile` extracts ActionScript (see `scripts/decompile-flash.ts`).

## Model components

### TerrestrialModel

| Property | Role |
|---|---|
| `latitudeProperty`, `longitudeProperty` | Observer location |
| `mapCenterLongitudeProperty` | Flat map pan |
| `coordinateFormatProperty` | Decimal vs sexagesimal readouts |
| `primeMeridianVisibleProperty`, `meridiansVisibleProperty`, `parallelsVisibleProperty`, `dateLineVisibleProperty`, `geographicalLinesVisibleProperty`, `labelsVisibleProperty`, `showCitiesProperty` | Granular map/globe overlays |

`step()` is a no-op. `reset()` restores Lincoln defaults and overlay toggles.

### CelestialModel

| Property | Role |
|---|---|
| `starRaProperty`, `starDecProperty` | Guide star position |
| `raOffsetProperty` | Flat sky map RA pan |
| `coordinateFormatProperty` | Readout format |
| `gridVisibleProperty`, `equatorVisibleProperty`, `eclipticVisibleProperty`, `galacticEquatorVisibleProperty`, `equinoxesAndSolsticesVisibleProperty`, `celestialPolesVisibleProperty`, `constellationsVisibleProperty` | Overlays |

`step()` is a no-op.

### SeasonsModel

Canonical state is `sunEclipticLongitudeProperty` (0° = March equinox). Derived quantities (`sunDeclinationProperty`, `sunRightAscensionProperty`, `noonSunAltitudeProperty`, `dayOfYearProperty`, month/day strings) use `SunPosition.ts`.

| Property | Role |
|---|---|
| `latitudeProperty` | Observer latitude |
| `viewModeProperty` | Orbit vs celestial-sphere stage |
| `earthViewModeProperty` | Side vs sun-facing close-up |
| `sunbeamModeProperty` | Angle vs spread diagram |
| `subsolarPointVisibleProperty`, label toggles | Diagram overlays |
| `timer: TimeModel` | Play/pause; `step(dt)` advances λ☉ while playing |

## View components (per screen)

**Terrestrial:** `TerrestrialMapNode`, `GlobeObserverDragNode`, `TerrestrialScreenView` control panel; `CityData.ts`, `DateLineData.ts`.

**Celestial:** `FlatSkyMapNode`, `StarFieldNode` + `BrightStarCatalog.ts`, `ZodiacConstellations.ts`.

**Seasons:** `OrbitViewNode`, `SeasonsSphereNode`, `EarthCloseUpNode`, `EarthFromSunNode`, `SunlightAngleNode`, `SunbeamSpreadNode`, `MonthSelectorNode`, `SunMarkerNode`, `seasonsDate.ts`.

Sphere scenes follow RotatingSky paint order: `backLayer` (dashed far side) → opaque fills → `frontLayer` (solid near side) → stars/markers last.

## Key design decisions

- **One shared guide star** per Celestial screen across flat map and sphere; NAAP used different defaults per view — port chose compromise values.
- **Canonical seasons state = λ☉**, not raw day-of-year index.
- **Granular terrestrial toggles** instead of a single "reference circles" flag.
- **`DEFAULT_EARTH_MAP_RESOLUTION = "high"`** (Natural Earth); overridable via `?earthMapResolution=` and Preferences → Simulation.
- **`SkyCoordinates` alt-az API** is tested and reserved for horizon views in sibling sims; unused here.

## Common components

- `BasicCoordinatesAndSeasonsPanel` — pre-themed panel; projector-mode switching is automatic.
- `BasicCoordinatesAndSeasonsButtonOptions` / `ControlOptions` — flat button/combo/checkbox bundles.
- `TimeModel` — composed into `SeasonsModel` only.

## Disposal

`TimeModel.dispose()` and `SkyProjection.dispose()` exist. Screen-lifetime views and models do not call them today. `tests/memory-leak.test.ts` covers `TimeModel` only.

## Testing

`npm test` (vitest):

| File | Covers |
|---|---|
| `SunPosition.test.ts` | Cardinal δ☉/α☉, noon altitude, day↔λ☉, calendar |
| `SkyCoordinates.test.ts` | RA/Dec vectors, alt-az round-trips |
| `skyGraphics.test.ts` | Projection helpers |
| `formatAngles.test.ts` | DMS formatting |
| `TerrestrialModel.test.ts`, `CelestialModel.test.ts`, `SeasonsModel.test.ts` | Defaults, reset, stepping |
| `TimeModel.test.ts` | Clock behavior |
| `memory-leak.test.ts` | `TimeModel` dispose + GC |

## Multi-screen simulations

Three independent screen models — no shared root state. See [multi-screen.md](./multi-screen.md) for the fleet pattern.
