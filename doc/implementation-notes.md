# Implementation Notes - Basic Coordinates and Seasons

## Architecture Overview

A three-screen SceneryStack sim porting the NAAP "Basic Coordinates and Seasons" lab
(astroUNL `naap/motion1`). All three screens are implemented: a shared orthographic sky
engine (ported from the sibling motion2 sim, `RotatingSky`) drives the globe / celestial
sphere / flat-map views, and a small pure-math module (`SunPosition.ts`) supplies the
seasons physics.

### High-Level Architecture

```
main.ts
  ├─ TerrestrialScreen   (Screen<TerrestrialModel, TerrestrialScreenView>)   src/terrestrial/
  ├─ CelestialScreen     (Screen<CelestialModel, CelestialScreenView>)       src/celestial/
  └─ SeasonsScreen       (Screen<SeasonsModel, SeasonsScreenView>)           src/seasons/

Each screen folder:
  <Prefix>Screen.ts                     wires model + view, homeScreenIcon, keyboard help
  model/<Prefix>Model.ts                Property-based state (+ derived quantities)
  view/<Prefix>ScreenView.ts            visuals, screenSummaryContent + pdomOrder
  view/<Prefix>ScreenSummaryContent.ts  live PDOM overview (a11y.<screenKey> strings)
  view/<Prefix>KeyboardHelpContent.ts   keyboard help dialog

src/common/                              shared sky engine + sim-wide helpers
  ├─ SkyCoordinates.ts                   pure angle math (deg/rad/hours, normalize)
  ├─ SkyProjection.ts                    orthographic 3D→2D projector (rotatable camera)
  ├─ SunPosition.ts                      seasons physics (δ☉, α☉, noon altitude, dates)
  ├─ view/skyGraphics.ts                 great-circle / small-circle projection helpers
  ├─ view/starGraphics.ts                star shape factory
  ├─ view/CelestialSphereNode.ts         equator + ecliptic + grid on a projected sphere
  ├─ view/CoordinateGuideNode.ts         draggable guide star with RA/Dec circle guides
  ├─ view/EarthGlobeNode.ts              projected Earth globe (coastline polygons)
  ├─ view/FlatEarthMapNode.ts            equirectangular map + draggable observer
  ├─ view/EditableNumberFieldNode.ts     label + type-in numeric field
  ├─ view/SkyReadoutNode.ts              paired editable coordinate fields
  ├─ view/attachSkyCameraInteraction.ts  pointer + arrow-key camera rotation
  ├─ model/EarthShoreData*.ts            NAAP (low) + Natural Earth (high) coastlines
  ├─ BasicCoordinatesAndSeasonsHotkeyData.ts  shared arrow-key bindings
  ├─ BasicCoordinatesAndSeasonsScreenIcons.ts programmatic home-screen icons
  ├─ BasicCoordinatesAndSeasonsPanel.ts        pre-themed panel
  ├─ BasicCoordinatesAndSeasonsButtonOptions.ts flat button/combo-box option bundles
  ├─ BasicCoordinatesAndSeasonsControlOptions.ts checkbox/number-control option bundles
  └─ TimeModel.ts                              composable play/pause + elapsed time

src/preferences/
  ├─ BasicCoordinatesAndSeasonsPreferencesModel  earthMapResolution ("low"/"high")
  ├─ BasicCoordinatesAndSeasonsPreferencesNode   Preferences → Simulation UI
  └─ basicCoordinatesAndSeasonsQueryParameters   query-parameter declarations
```

Data flows Model → View through AXON `Property` objects. Views observe Properties via
`.link()` / `Multilink` and redraw reactively. The generic engine files (`SkyProjection`,
`SkyCoordinates`, `skyGraphics`, …) keep their domain names — they are astronomy utilities,
not sim-branded classes.

## Porting map (NAAP → screens)

| Screen | NAAP animation (published) | flashdev2 source (decompile target) |
|---|---|---|
| Terrestrial Coordinates | `tc_flat.swf` | `mapExplorer/mapExplorer010.swf` |
| Terrestrial Coordinates | `tc_globe.swf` | `longLatDemo/longLatDemo014.swf` |
| Celestial Coordinates | `cec_flat.swf` | `simpleFlatSkyMap/simpleFlatSkyMap007.swf` |
| Celestial Coordinates | `cec_sky.swf` | `skyMap/skyMap028.swf` |
| Seasons | `seasons_ecliptic.swf` | `eclipticSimulator/eclipticSimulator025.swf` |

`npm run decompile` extracts the ActionScript for all five (see `scripts/decompile-flash.ts`).
Control inventories transcribed from the decompiled `onReset` handlers live in
`doc/naap-control-inventory.md`.

## Model Components

- **TerrestrialModel** — `latitudeProperty`, `longitudeProperty`, `referenceCirclesVisibleProperty`.
- **CelestialModel** — `starRaProperty`, `starDecProperty`, and grid/equator/ecliptic/constellation
  visibility toggles.
- **SeasonsModel** — canonical state is `sunEclipticLongitudeProperty` (0° = March equinox); the Sun's
  declination, right ascension, noon altitude, day-of-year, and month/day are `DerivedProperty`s over it
  (and `latitudeProperty`), computed with `SunPosition.ts`. A composed `TimeModel` drives play/pause;
  `step(dt)` advances λ☉ while playing.

The seasons physics (`src/common/SunPosition.ts`, unit-tested in `tests/SunPosition.test.ts`):
`sin δ☉ = sin ε · sin λ☉`, `α☉ = atan2(sin λ☉ · cos ε, cos λ☉)`, `h = 90° − |φ − δ☉|`, and a circular
orbit `λ☉ = 360° · (dayOfYear − MARCH_EQUINOX_DAY) / DAYS_PER_YEAR` with `MARCH_EQUINOX_DAY = 79.25`,
`ε = 23.4°`, `DAYS_PER_YEAR = 365.24`.

## View Components

Each `*ScreenView.ts` lays out its nodes in `layoutBounds`, fills the background from
`BasicCoordinatesAndSeasonsColors`, wires a `ResetAllButton` to `model.reset()`, and sets an explicit
`pdomOrder`. Control panels use `BasicCoordinatesAndSeasonsPanel` so projector-mode switching is
automatic. Sphere scenes follow the RotatingSky paint order: `backLayer` (dashed far side) → opaque
fills → `frontLayer` (solid near side) → stars/markers last.

### Color Scheme

`BasicCoordinatesAndSeasonsColors.ts` defines `ProfileColorProperty` instances for "default" (dark) and
"projector" (light) profiles. SceneryStack switches profiles automatically when the user toggles
Projector Mode in Preferences.

### Accessibility

Every interactive node has an `accessibleName`; each screen's `*ScreenSummaryContent` exposes a live
`currentDetailsContent` `PatternStringProperty` over model Properties. Keyboard help is built from
scenerystack's localized sections (`MoveDraggableItems`, `SliderControls`, `TimeControls`,
`BasicActions`) matching each screen's real drag/slider/time interactions.

## Preferences

The one sim preference is **Earth Map Detail** (`earthMapResolution`: `low` = original NAAP outline,
`high` = Natural Earth polygons), initialized from the `?earthMapResolution=` query parameter and
threaded from `main.ts` into the Terrestrial screen's globe and flat map.

## Known gaps / TODOs

- `public/icons/icon.svg` is still the template icon — replace and run `npm run icons` for the
  navigation-bar/PWA icon (the in-sim home-screen icons are programmatic and done).
- No `dispose()` calls yet — add them if any Node gains listeners that outlive it.
