# Model - Basic Coordinates and Seasons

This document describes the model (the underlying physics, math, and behavior) for the simulation, in
terms appropriate for an educator. It is the companion to
[implementation-notes.md](./implementation-notes.md), which targets developers.

> **Status:** implemented. The equations below are realized in `src/common/SunPosition.ts`
> (unit-tested in `tests/SunPosition.test.ts`) and consumed by the three screen models.

## Overview

The simulation teaches the two coordinate systems students need before doing positional astronomy,
then uses them to explain the seasons:

1. **Terrestrial Coordinates** — longitude and latitude locate a point on Earth's surface. A flat
   map and a globe show the same grid so students connect the 2D projection to the sphere.
2. **Celestial Coordinates** — right ascension and declination locate a point on the celestial
   sphere, in direct analogy to longitude/latitude. A flat sky map and a celestial sphere show the
   same equatorial grid.
3. **Seasons** — Earth orbits the Sun with its rotation axis tilted 23.4° from the orbital normal.
   The tilt (not the Earth–Sun distance) drives the seasons: it sets the Sun's declination through
   the year, which sets noon altitude and daylight hours at each latitude.

## Quantities and units

| Quantity | Symbol | Units | Range |
|---|---|---|---|
| longitude | λ | degrees | 180° W – 180° E |
| latitude | φ | degrees | 90° S – 90° N |
| right ascension | α | hours | 0 h – 24 h |
| declination | δ | degrees | −90° – +90° |
| axial tilt (obliquity) | ε | degrees | 23.4° (fixed) |
| Sun's ecliptic longitude | λ☉ | degrees | 0° – 360° (one year) |

## Governing equations

- The Sun's declination through the year: sin δ☉ = sin ε · sin λ☉.
- The Sun's right ascension: α☉ = atan2(sin λ☉ · cos ε, cos λ☉), normalized to [0 h, 24 h).
- Noon solar altitude at latitude φ: h = 90° − |φ − δ☉|.
- The orbit is modeled as circular (the NAAP original does the same); one full orbit = one year.
  The Sun's ecliptic longitude maps to the calendar as λ☉ = 360° · (dayOfYear − 79.25) / 365.24,
  so λ☉ = 0° at the March equinox (day ≈ 79.25). When playing, the Seasons screen advances the
  date at 5 simulated days per real second.

## Simplifications and assumptions

- Circular Earth orbit; no equation of time, precession, refraction, or twilight modeling.
- The celestial sphere is treated as infinitely distant; star positions are fixed.
- Obliquity is constant at 23.4°.

## References

- NAAP "Basic Coordinates and Seasons" lab: https://astro.unl.edu/naap/motion1/motion1.html
