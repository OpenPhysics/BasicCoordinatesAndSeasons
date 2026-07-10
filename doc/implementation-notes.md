# Implementation Notes - Basic Coordinates and Seasons

## Architecture Overview

A three-screen SceneryStack sim porting the NAAP "Basic Coordinates and Seasons" lab
(astroUNL `naap/motion1`). Currently a framework scaffold: each screen shows a placeholder
label and a Reset All button; the models are empty coordinators.

### High-Level Architecture

```
main.ts
  ├─ TerrestrialScreen   (Screen<TerrestrialModel, TerrestrialScreenView>)   src/terrestrial/
  ├─ CelestialScreen     (Screen<CelestialModel, CelestialScreenView>)       src/celestial/
  └─ SeasonsScreen       (Screen<SeasonsModel, SeasonsScreenView>)           src/seasons/

Each screen folder:
  <Prefix>Screen.ts
  model/<Prefix>Model.ts
  view/<Prefix>ScreenView.ts            visuals, screenSummaryContent + pdomOrder
  view/<Prefix>ScreenSummaryContent.ts  PDOM overview (a11y.<screenKey> strings)
  view/<Prefix>KeyboardHelpContent.ts   keyboard help dialog

src/common/
  ├─ BasicCoordinatesAndSeasonsPanel.ts          pre-themed panel
  ├─ BasicCoordinatesAndSeasonsButtonOptions.ts  flat button/combo-box option bundles
  └─ TimeModel.ts                                composable play/pause + elapsed time

src/preferences/
  ├─ BasicCoordinatesAndSeasonsPreferencesModel  sim-specific pref state
  ├─ BasicCoordinatesAndSeasonsPreferencesNode   pref UI shown in Preferences → Simulation
  └─ basicCoordinatesAndSeasonsQueryParameters   query-parameter declarations
```

Data flows Model → View through AXON `Property` objects. The view observes
properties via `.link()` or `.lazyLink()` and updates reactively.

## Porting map (NAAP → screens)

| Screen | NAAP animation (published) | flashdev2 source (decompile target) |
|---|---|---|
| Terrestrial Coordinates | `tc_flat.swf` | `mapExplorer/mapExplorer010.swf` |
| Terrestrial Coordinates | `tc_globe.swf` | `longLatDemo/longLatDemo014.swf` |
| Celestial Coordinates | `cec_flat.swf` | `simpleFlatSkyMap/simpleFlatSkyMap007.swf` |
| Celestial Coordinates | `cec_sky.swf` | `skyMap/skyMap028.swf` |
| Seasons | `seasons_ecliptic.swf` | `eclipticSimulator/eclipticSimulator025.swf` |

`npm run decompile` extracts the ActionScript for all five (see `scripts/decompile-flash.ts`);
`--all` adds supporting concept demos (sexagesimal calculator, daylight hours explorer,
obliquity, latitude-angle demo). The `RotatingSky` sibling sim's 2D orthographic
`SkyProjection` and celestial-sphere view code is the natural starting point for the
Celestial screen.

## Model Components

Each `*Model.ts` is an empty coordinator with documented hooks for `step(dt)` and
`reset()`. Compose `src/common/TimeModel.ts` into a screen model for play/pause +
elapsed-time behavior (the Seasons screen's animated orbit will want this).

## View Components

Each `*ScreenView.ts` demonstrates layout using `layoutBounds`, background fill from
`BasicCoordinatesAndSeasonsColors.ts`, and a `ResetAllButton` wired to `model.reset()`.
All control panels should use `BasicCoordinatesAndSeasonsPanel` so projector-mode switching
is automatic.

### Color Scheme

`BasicCoordinatesAndSeasonsColors.ts` defines `ProfileColorProperty` instances for "default"
(dark) and "projector" (light) profiles. SceneryStack switches profiles automatically when
the user toggles Projector Mode in Preferences.

## Known gaps / TODOs

- All three models and views are placeholders — port the NAAP behavior per the map above.
- pdomOrder TODO comments in each `*ScreenView` — add interactive nodes as they are created.
- Home-screen icons: each screen currently uses the SceneryStack default `ScreenIcon`.
- `public/icons/icon.svg` is still the template icon — replace and run `npm run icons`.
- No dispose() calls yet — add them once Properties gain external listeners.
