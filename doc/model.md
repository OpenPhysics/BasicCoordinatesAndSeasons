# Model - Basic Coordinates and Seasons

This document describes the model (the underlying physics, math, and behavior) for the simulation,
in terms appropriate for an educator. It is the companion to
[implementation-notes.md](./implementation-notes.md), which targets developers.

## Overview

The simulation is a SceneryStack port of the NAAP **Basic Coordinates and Seasons** lab
([astro.unl.edu/naap/motion1](https://astro.unl.edu/naap/motion1/motion1.html)). It teaches the
coordinate systems students need before positional astronomy, then uses them to explain the seasons.

The lab unfolds across three screens with a deliberate progression:

1. **Terrestrial Coordinates** — longitude λ and latitude φ locate a point on Earth. The same observer
   appears on a flat equirectangular map and on an orthographic globe so students connect the 2D
   projection to the sphere. Optional overlays show meridians, parallels, the date line, reference
   cities, and geographical circles tied to Earth's axial tilt (equator, tropics, polar circles).
2. **Celestial Coordinates** — right ascension α and declination δ locate a point on the celestial
   sphere, in direct analogy to longitude and latitude. A flat sky map and a celestial sphere show the
   same equatorial grid. Bright stars and optional zodiac stick figures provide context; overlays can
   show the celestial equator, ecliptic, galactic equator, equinox/solstice markers, and the poles.
3. **Seasons** — Earth orbits the Sun with its rotation axis tilted **ε = 23.4°** from the orbital
   normal. The tilt (not Earth–Sun distance) drives the seasons: it sets the Sun's declination through
   the year, which sets noon altitude at each latitude. Students can view an orbit diagram, a
   celestial-sphere view, Earth close-ups, and sunbeam angle or spread diagrams; play/pause advances the
   calendar through the year.

Screens 1 and 2 are **pure coordinate geometry** — no time evolution, no physics step. Only the
Seasons screen advances a date while playing.

## Quantities and units

| Quantity | Symbol | Units | Range / notes |
|---|---|---|---|
| Longitude | λ | degrees (+E) | −180° – +180° |
| Latitude | φ | degrees (+N) | −90° – +90° |
| Right ascension | α | hours | 0 h – 24 h |
| Declination | δ | degrees | −90° – +90° |
| Axial tilt (obliquity) | ε | degrees | 23.4° (fixed) |
| Sun's ecliptic longitude | λ☉ | degrees | 0° – 360° (0° = March equinox) |
| Day of year | — | days | 1 – 365.24 (derived on Seasons screen) |
| Noon Sun altitude | h | degrees | can be &lt; 0 (polar night) |

Coordinate readouts can be shown in decimal degrees or sexagesimal (degrees, minutes, seconds).

## Governing equations (Seasons screen)

The Seasons physics live in `src/common/SunPosition.ts` and are unit-tested. Terrestrial and Celestial
screens have no governing ODEs — only spherical geometry for map and sphere views.

**Sun's declination through the year:**

```
sin δ☉ = sin ε · sin λ☉
```

**Sun's right ascension** (normalized to [0 h, 24 h)):

```
α☉ = atan2(sin λ☉ · cos ε, cos λ☉)
```

**Noon solar altitude** at latitude φ (magnitude formula used in readouts):

```
h = 90° − |φ − δ☉|
```

**Circular orbit mapping** (NAAP convention):

```
λ☉ = 360° · (dayOfYear − MARCH_EQUINOX_DAY) / DAYS_PER_YEAR
```

with `MARCH_EQUINOX_DAY = 79.25`, `DAYS_PER_YEAR = 365.24`, `ε = 23.4°`. The canonical model state is
λ☉; month/day and day-of-year are derived from it.

**Animation:** while playing, λ☉ advances at `(360 / DAYS_PER_YEAR) × 5 × timeSpeed × dt` degrees per
real second at normal speed — about **5 simulated days per real second**. Slow speed is one-third of
that rate.

## Initial conditions and NAAP differences

| Screen | Quantity | This sim (reset default) | NAAP Flash notes |
|---|---|---|---|
| Terrestrial | Location | 40.8° N, 96.7° W (Lincoln, NE) | Same |
| Terrestrial | Map center | 0° (Greenwich centered) | — |
| Celestial | Guide star | α = 8 h, δ = +30° | Flat map used 8.5 h / +35°; sphere used 8 h / +60° — port uses a compromise |
| Celestial | Flat map RA offset | 16.5 h | Matches NAAP flat map |
| Seasons | Start date | day-of-year **41** (≈ Feb 10) | NAAP used day **40** (same calendar date, different indexing) |
| Seasons | Observer latitude | **40.8° N** | NAAP used **10° N** — intentional divergence (shared default with Terrestrial) |
| All | Obliquity | **23.4°** | Flash code; student guide prose often says 23.5° |

## Screen-by-screen behavior

### Terrestrial Coordinates

Students drag an observer on the flat map or globe; longitude and latitude update together. Overlays
(meridians every 30°, prime meridian, date line, geographical lines, city markers) are independent
toggles. There is no simulated clock or seasonal change.

### Celestial Coordinates

Students position a guide star with RA/Dec sliders or by dragging on the flat map or sphere. The flat
map supports panning in RA via an offset control. Grid, equator, ecliptic, galactic equator, equinox/
solstice markers, and pole labels are optional overlays.

### Seasons

Students scrub λ☉ or use month/day controls, change observer latitude, and switch among orbit view,
celestial-sphere view, Earth side/sun-facing close-ups, and sunbeam angle or spread panels. The
**subsolar point** latitude equals δ☉. Readouts show δ☉, α☉, noon altitude, and calendar date. The
sim does **not** compute daylight duration — only noon altitude and geometric sunbeam diagrams.

## Simplifications and assumptions

- **Circular Earth orbit** (NAAP same); no equation of time, precession, nutation, atmospheric
  refraction, twilight bands, or leap years in the calendar display (month lengths use a fixed
  non-leap 365-day table while orbital math uses 365.24 days/year).
- **Fixed obliquity** ε = 23.4°.
- **Celestial sphere at infinite distance**; bright-star positions are fixed (`BrightStarCatalog`).
- **Horizon / alt-az transforms** are implemented in shared code for possible future use but are not
  wired to any screen in this sim (see sibling sim **RotatingSky**).
- Earth map detail can be low-resolution (NAAP outline) or high-resolution (Natural Earth) via
  Preferences; default is **high**.

## References

- NAAP "Basic Coordinates and Seasons" lab: https://astro.unl.edu/naap/motion1/motion1.html
- NAAP student guide: `naap_motion1_sg.pdf` (referenced in `doc/naap-control-inventory.md`)
- In-repo NAAP control inventory and Flash formula cross-checks: `doc/naap-control-inventory.md`
- Sibling sim **RotatingSky** (motion2) — shared sky-engine lineage (`SkyProjection`, horizon math)
