# NAAP motion1 — Control Inventory & Behavioral Notes

Source of truth for the UI/physics of the five NAAP Flash explorers being ported into
**Basic Coordinates and Seasons**. Compiled in Phase 0 (Steps 0.3–0.4 of the porting plan)
from the decompiled ActionScript under `NAAP/decompiled/<name>/scripts/` (see
`npm run decompile`), the poster JPEGs under
`NAAP/naap-air-app/files/motion1/animations/`, and the student guide
`NAAP/astroUNL/naap/motion1/naap_motion1_sg.pdf` + lab HTML pages.

Every control default/range/formula below is cited to the exact `.as` file (and usually
line) it came from. Where the poster and the code disagree, **the decompiled code is
authoritative** — posters are illustrative post-interaction captures.

Sections:
1. [Cross-cutting resolutions](#cross-cutting-resolutions) — synthesized decisions that drive Phases 1–5
2. [mapExplorer010 (tc_flat)](#mapexplorer010-tc_flat--terrestrial-flat-map-explorer)
3. [longLatDemo014 (tc_globe)](#longlatdemo014-tc_globe--terrestrial-globe-explorer)
4. [simpleFlatSkyMap007 (cec_flat)](#simpleflatskymap007-cec_flat--celestial-flat-sky-map)
5. [skyMap028 (cec_sky)](#skymap028-cec_sky--celestial-sky-explorer-sphere)
6. [eclipticSimulator025 (seasons_ecliptic)](#eclipticsimulator025-seasons_ecliptic--seasons-and-ecliptic-simulator)
7. [Behavioral notes from the student guide & lab pages](#behavioral-notes-from-the-student-guide--lab-pages)

---

## Cross-cutting resolutions

These reconcile the five explorers into the port's shared model/constants and resolve the
open questions the plan flagged. **Read this before Phases 1–5.**

### Obliquity — resolved to **23.4°**

The Flash code uses **ε = 23.4°** everywhere (ecliptic `tilt:23.4`; tropic circles `dec:±23.4`;
arctic/antarctic `dec:±66.6`; the ecliptic-longitude→declination reduction uses
`tan 23.4° = 0.43273864`; the seasons engine encodes obliquity as sphere `latitude = 66.6`,
and 90 − 66.6 = 23.4). This matches `doc/model.md` and the plan's `OBLIQUITY_DEGREES = 23.4`.

⚠️ **Discrepancy (documented, not adopted):** the *prose* student guide and `orbits_light.html`
say **23.5°** (and `tc_units.html` gives the tropics at 23°27′ ≈ 23.45°, polar circles 66°33′).
The port follows the animations' **23.4°**, since we are porting the animations. Keep the two
numbers in mind when comparing against the printed guide's worked answers.

### Default coordinates (verified against `onReset`/constructors)

| Sim state | NAAP default | Cite | Port constant |
|---|---|---|---|
| Terrestrial latitude | **40.8° N** | `Map.as:18`, `longLatDemo DefineSprite_130/…DoAction.as:132` | `DEFAULT_LATITUDE = 40.8` ✅ (plan) |
| Terrestrial longitude | **96.7° W** (i.e. −96.7) | same | `DEFAULT_LONGITUDE = -96.7` ✅ (plan) |
| Globe camera orientation | θ = 290°, φ = 25° | `…DoAction.as:133 setThetaAndPhi(290,25)`; globe radius r = 150 | Phase 2.3 |
| Celestial star — flat map | RA **8.5 h**, Dec **+35°** | `Flat Sky Map.as:23 moveCursor({dec:35,ra:8.5})` | see note ↓ |
| Celestial star — sphere | RA **8.0 h**, Dec **+60°** | `skyMap DoAction.as:147 moveCursorTo({ra:-8,dec:60})` | see note ↓ |
| Celestial sphere camera | θ 90°, φ (tilt) 30°, latitude 90° (N pole), FOV 180°, r = 250 | `skyMap DoAction.as:111-146` | Phase 3.4 |
| Seasons day-of-year | **40 → "10 February"** (0-based; day 0 = 1 Jan) | `eclipticSim …Symbol 1/…DoAction.as onReset changeDayOfYear(40)` | see note ↓ |
| Seasons observer latitude | **10.0° N** | `…onReset changeLatitude(10)` | Phase 4.1 |

**Note — celestial star default:** the two celestial explorers ship *different* star defaults
(flat 8.5 h/+35°, sphere 8.0 h/+60°). The port shares one star Property across both views, so
**pick one**: recommend **RA 8.0 h, Dec +30°** (round, mid-latitude, on-screen in both views) OR
simply adopt the flat map's **8.5 h / +35°**. The plan's provisional `RA 6 / Dec 30` is *not* a
NAAP default — replace it. Decide in Phase 3.1 and record the choice there.

**Note — seasons default day:** NAAP's canonical state is a day-of-year index (0 = 1 Jan), with
`daysSinceVE = dayOfYear + 286` and the vernal equinox at **day-of-year 79 = "21 March"**
(daysSinceVE = 0). The port's canonical state is `sunEclipticLongitudeProperty` (0° = March
equinox). NAAP's default day 40 → daysSinceVE 326 → **λ ≈ 321.6°** (late-winter, δ ≈ −13°).
The plan defaults the port to **λ = 0 (March equinox)** — simpler and pedagogically neutral.
Either is defensible; **recommend λ = 0** for the port and note the divergence from NAAP's day-40
default. Decide in Phase 4.1.

### Core physics — formulas as they appear in the AS (all use ε = 23.4°)

- **Ecliptic longitude from the vernal equinox:** `λ = daysSinceVE · 360 / 365`,
  `daysSinceVE = dayOfYear + 286` (`eclipticSim update L118`, `changeDayOfYear L72`).
  ⇒ the port's `eclipticLongitudeForDayOfYear` uses a **365-day** year and **March-equinox day ≈ 79**
  (NAAP uses 365 flat, not 365.24; the plan's `DAYS_PER_YEAR = 365.24` / equinox 79.25 is a slight
  refinement — keep the plan's values for the port but know NAAP used 365 / day-79).
- **Sun declination:** `sin δ = sin ε · sin λ` (the engine's `pointToHorizon` with sphere
  latitude 66.6° and siderealTime 12 h reduces exactly to this) — matches `doc/model.md`.
- **Sun right ascension (readout):** NAAP shows `RA = ((−6 − az/15) mod 24)` capped 23.94 h. The
  port's `α☉ = atan2(sin λ · cos ε, cos λ)` gives the same standard RA (0 h at March equinox,
  6 h at June solstice, …).
- **Noon / observer sun altitude:** NAAP uses **`h = 90 − latitude + δ`**, and when `h > 90` it
  reflects `h = 180 − h` and reports the Sun to the **North** (else South). This is *magnitude-
  equivalent* to the plan/`model.md` `h = 90 − |φ − δ|`; NAAP additionally yields a **N/S sun
  direction** worth showing in the Phase 5 readout. (`eclipticSim update L184-208`.)
- **Most-/least-direct-ray latitudes (student guide rules):** most-direct latitude = δ (subsolar
  latitude); least-direct latitude = (90 − |δ|) in the opposite hemisphere.

### Zodiac constellation data — **use skyMap028's `Symbol 1.as` `constellationsData`**

The plan's Step 3.2 fallback ladder resolves cleanly to option (a), and specifically to the
**sky explorer**, not the flat map:

- **`skyMap028/scripts/%3Cdefault package%3E/Symbol 1.as` `constellationsData` (≈L368)** stores
  **13 zodiac constellations** as `{ path, radius, center, stars:[{ name, x, y, z }, …] }` — stars
  are **named** (Bayer designations) **unit 3-vectors** on the celestial sphere. This is directly
  transcribable to the port's `{ raHours, decDeg }` (RA = atan2(y,x)→hours, Dec = asin(z)) with names.
  **Prefer this source.**
- `simpleFlatSkyMap007/scripts/.../Constellations Data.as` stores the same 12 figures as
  **screen-pixel `{x,y}` points with no names** — harder to use; ignore in favor of the sky-explorer data.
- `path` encodes edges as runs `{ m, b, e }`: `moveTo(stars[m])`, then `lineTo(stars[b..e-1])`.

### Animation pace

NAAP advances **`animateRate = 0.005` days/ms = 5 simulated days per real second** (wall-clock
`getTimer()`-based, frame-rate independent; a 365-day year ≈ 73 s). Day always advances forward,
single `start animation` toggle, **no speed control**. ⇒ set the port's
`SEASONS_ANIMATION_DAYS_PER_SECOND ≈ 5` (the plan's provisional 15 is 3× too fast — start at **5**).

### Readout formatting conventions (shared)

- **Hemisphere letters, never signed:** latitude `X.X° N/S`, longitude `X.X° E/W` (both terrestrial
  explorers). RA `X.X h`, Dec `X.X°` (signed) on the celestial explorers.
- **1 decimal place** in decimal mode (`.toFixed(1)`) everywhere.
- Sexagesimal mode (a secondary radio, default **off** on every explorer) shows **degrees + minutes
  only** (or hours + minutes for RA) — **seconds/arcseconds are computed but never displayed**.
  The port may **drop sexagesimal mode** unless fidelity requires it (flag: it is off by default and
  pedagogically minor).
- **Flat sky map axes:** RA **increases to the LEFT** (0 h at right edge), 3 h grid spacing; Dec +90°
  top → −90° bottom, 30° grid spacing.
- **Seasons date readout:** `"<day-of-month> <FullMonthName>"`, no year (e.g. "10 February"). Month
  names must be localized for the port.

### Controls the port may consciously drop (record the reason if dropped)

- "open Google Maps" button (both terrestrial explorers) — external link, out of scope.
- "show cities" + city dots (both terrestrial) — 20 hard-coded cities; optional, low pedagogy.
- Sexagesimal readout radio (all explorers) — off by default; drop unless fidelity requires.
- "show galactic equator" (both celestial) — off by default, minor; optional.
- Dead code flagged: `setShowFeatures`/`showFeaturesCheck` in `simpleFlatSkyMap DoAction.as` (no
  backing control) — ignore.

### Reference-line reality check

The **terrestrial explorers draw NO tropics/polar circles and no full graticule** — only the
equator, prime meridian, and International Date Line (globe), toggled by a single "show features"
checkbox (its geometry is SWF timeline art, not AS). Plan Steps 2.1/2.2 assume tropics ±23.4° /
polar circles ±66.6° "if NAAP draws them" — **NAAP does not**; adding them is a port enhancement,
not fidelity. The **tropic/arctic circles appear only on the Seasons close-up globe**
(`eclipticSim init L493-497,574-578`).

---

## mapExplorer010 (tc_flat — Terrestrial Flat Map Explorer)

An equirectangular world map (700×350 px surface) with a draggable observer cursor; clicking the map sets the observer's longitude & latitude, which are shown as text readouts (decimal or sexagesimal) plus red/blue guide lines on the map. The map can be panned east/west by shift-dragging or by ±45° "shift map" arrow buttons.

### Controls

| Control | Type | Default | Range/Step | Behavior/Notes |
|---|---|---|---|---|
| Observer cursor (map click/drag) | Draggable point on map | lat **40.8**, lon **−96.7** → shown "40.8° N", "96.7° W" | lat −90…+90; lon 0…360 (wrapped, shown 0…180 E/W); continuous (no step) | `Map.as:18 moveCursor({lat:40.8,lon:-96.7})`. Click sets cursor; hold to drag (`moveCursorOnMouseMoveFunc`). Valid drop region x∈[0,700], y∈[−175,175] (`Map.as:114,231`). |
| Map pan (shift-drag) | Shift+drag on map | starting offset 190 | wraps mod 360 | `Map.as:112` (Key 16 = Shift). Drag changes `_longitudeOffset` by `−dx*0.514286` deg (`Map.as:132-137`). |
| shift map ◄ (left arrow) | Push button | label `""` (arrow art) | −45° per click | `clickHandler="shiftLeft"` → `doShift(-45)`, animated over 400 ms (`DoAction.as:15-27,71`). Symbol `FPushButtonSymbol_25`. |
| shift map ► (right arrow) | Push button | label `""` (arrow art) | +45° per click | `clickHandler="shiftRight"` → `doShift(45)` (`DoAction.as:27-29`). Symbol `FPushButtonSymbol_32`. |
| decimal | Radio (group `formatGroup`, data `"d"`) | **selected** (`initialState=true`) | — | `PlaceObject2_111_FRadioButtonSymbol_47`. `changeHandler="updateStrings"`. |
| sexagesimal | Radio (group `formatGroup`, data `"s"`) | unselected (`initialState=false`) | — | `PlaceObject2_111_FRadioButtonSymbol_53`. Switches readout to DMS (deg+min only). |
| show cities | Checkbox | **off** (`initialValue=false`) | — | label `" show cities"`, `changeHandler="changeShowCities"` → `setShowCities` toggles `citiesMC._visible` (`DoAction.as:65-68`, `Map.as:336-339`). Symbol `FCheckBoxSymbol_13`. |
| show map features | Checkbox | **off** (`initialValue=false`) | — | label `" show map features"`, `changeHandler="changeShowMapFeatures"` → `setShowMapFeatures` toggles the latitude/longitude "features" clips (reference lines) + `mapFeaturesMC` (`DoAction.as:61-64`, `Map.as:330-335`). Symbol `FCheckBoxSymbol_19`. |
| open Google Maps | Push button | label `"open Google Maps"` | — | `clickHandler="openGoogle"` opens maps.google.com with the current lon/lat (`DoAction.as:54-60`). Symbol `FPushButtonSymbol_7`. |

Notes on defaults confirmed by the poster JPEG: cursor near central USA reading "40.8° N" (blue) / "96.7° W" (red); decimal radio selected; both checkboxes unchecked; on-screen hint text "click on the map to change the cursor location / shift-click to drag the map left or right".

### Readouts & formatting

Two text readouts, "latitude:" and "longitude:", plus on-map labels (two copies each, for the wraparound). Format chosen by `formatGroup` (`DoAction.as:30-49`).

- **Decimal mode** (default): `latitudeDecimalString + "° " + latitudeDirectionString`, e.g. `40.8° N`; longitude `96.7° W`.
  - Decimal string = `Math.abs(value).toFixed(1)` → **exactly 1 decimal place** (`Map.as:291-310`).
  - Direction letters: latitude **N** if lat ≥ 0 else **S**; longitude **E** if wrapped lon ≤ 180 else **W** (`Map.as:289-311`). Values are always shown positive with a hemisphere letter — never signed.
- **Sexagesimal mode**: `latitudeDMSString` / `longitudeDMSString`.
  - Format = `ideg + "° " + (imin<10 ? "0"+imin : imin) + "' " + direction`, e.g. `40° 48' N`, `96° 42' W` (`Map.as:279-299, 318-327`).
  - **Degrees and minutes only** (minutes zero-padded to 2 digits). Seconds (`fsec`/`isec`) are computed but **not** included in the string. Degree symbol `°`, minutes symbol `'`. Same N/S and E/W hemisphere letters.
- Google Maps URL uses decimal string with no space before the letter: `lon+lat`, e.g. `96.7W+40.8N` (`DoAction.as:56-58`).
- Longitude axis tick labels along the top/bottom read `"180°"`, `"0°"`, `"<n>° W"` (for lon>180), `"<n>° E"` (for lon<180), stepped every 45° (`Map.as:200-224`).

### Constants & math

Surface coordinate system: map is **700 px wide × 350 px tall**, x∈[0,700], y∈[−175,+175] (origin at map center; `Map.as:114,231`).

- **Pixels-per-degree** `= 1.9444444444444444` (= 700/360). Used for both axes.
  - Screen X: `x = (lon + 180) * 1.9444444…`, then `x = ((x % 700) + 700) % 700`; a second copy `x2 = x1 + 700` for wraparound (`Map.as:253-256`).
  - Screen Y: `y = lat * -1.9444444…` (north is up; lat 90 → y −175) (`Map.as:257`).
- **Degrees-per-pixel** `= 0.5142857142857142` (= 360/700). Inverse of above.
  - `lat = y * -0.5142857…`; `lon = ((_longitudeOffset + x*0.5142857…) % 360 + 360) % 360` (`Map.as:233-234`).
- **Longitude offset** default **190** (`Map.as:17 setLongitudeOffset(190)`); stored as `((arg % 360)+360)%360`. Map pan sets `mapMC._x = (-(offset+180) * 1.9444444…) % 700` (`Map.as:195-196`).
- **Shift buttons**: ±45° per press, eased animation `u = pow(t/totalTime, 0.4)`, `totalTime = 400` ms (`DoAction.as:1-29,71`).
- **Shift-drag**: `newOffset = initOffset − (dx) * 0.5142857…` (`Map.as:134`).
- **Longitude labels**: 8 labels, base `labelLong = 45 * ceil(offset/45)`, stepped +45°, positioned `(labelLong − offset) * 1.9444444… − 40.5` (`Map.as:199-224`).
- **Cursor guide-line colors** (`Map.as:168-177`): longitude segment `0xFE4B4B` (=16665419, red) drawn from x=350 top; latitude segment `0x4B4BFE` (=4934654, blue) dropping to cursor; both `lineStyle(3,…,80)`. Longitude "features" reference-line color `0xFF8339` (=16745273; `Map.as:68`). The International Date Line vertices are hard-coded in `Map.as:341 p.IDL`.

**Reference lines (equator, tropics ±23.4°, arctic/antarctic circles ±66.6°):** The map does draw latitude/longitude "features," but they live in the symbols **"Map Latitude Features"** and **"Map Longitude Features"** (attached in `Map.as:3-4`) whose geometry is baked into the SWF timeline art, **not** in ActionScript. Both are hidden by default (`Map.as:14-15 _visible=false`) and are toggled **together** by the single **show map features** checkbox (`Map.as:330-335`) — they are *not* individually toggleable. The specific latitude values (23.4°, 66.6°, etc.) do **not** appear anywhere in the decompiled AS (grep for `23.4/66.6/tropic/arctic/equator` found no numeric constants), so those values cannot be cited from source and must be read from the art or the sibling globe explorer.

### Source files cited

- `NAAP/decompiled/mapExplorer010/scripts/%3Cdefault package%3E/Map.as` — main map class: cursor default, coordinate math, offset, string formatting, cities, IDL, `setShow*`.
- `NAAP/decompiled/mapExplorer010/scripts/frame_1/DoAction.as` — timeline handlers: `updateStrings` (format switch), `shiftLeft/Right`, `openGoogle`, `changeShow*`, `totalTime=400`.
- `NAAP/decompiled/mapExplorer010/scripts/%3Cdefault package%3E/Map Latitude Label.as` — `setLabel` → `latitudeField.text`.
- `NAAP/decompiled/mapExplorer010/scripts/%3Cdefault package%3E/Map Longitude Label.as` — `setLabel` → `longitudeField.text`.
- `NAAP/decompiled/mapExplorer010/scripts/frame_1/PlaceObject2_111_FRadioButtonSymbol_47/CLIPACTIONRECORD on(initialize).as` — decimal radio (default selected, data "d").
- `NAAP/decompiled/mapExplorer010/scripts/frame_1/PlaceObject2_111_FRadioButtonSymbol_53/CLIPACTIONRECORD on(initialize).as` — sexagesimal radio (data "s").
- `NAAP/decompiled/mapExplorer010/scripts/frame_1/PlaceObject2_114_FCheckBoxSymbol_13/CLIPACTIONRECORD on(initialize).as` — "show cities" checkbox (initialValue false).
- `NAAP/decompiled/mapExplorer010/scripts/frame_1/PlaceObject2_114_FCheckBoxSymbol_19/CLIPACTIONRECORD on(initialize).as` — "show map features" checkbox (initialValue false).
- `NAAP/decompiled/mapExplorer010/scripts/frame_1/PlaceObject2_117_FPushButtonSymbol_7/CLIPACTIONRECORD on(initialize).as` — "open Google Maps" button.
- `NAAP/decompiled/mapExplorer010/scripts/frame_1/PlaceObject2_117_FPushButtonSymbol_25/CLIPACTIONRECORD on(initialize).as` — shift-left arrow button.
- `NAAP/decompiled/mapExplorer010/scripts/frame_1/PlaceObject2_117_FPushButtonSymbol_32/CLIPACTIONRECORD on(initialize).as` — shift-right arrow button.
- Poster reference: `NAAP/naap-air-app/files/motion1/animations/tc_flat.jpg`.

---

## longLatDemo014 (tc_globe — Terrestrial Globe Explorer)

A rotatable 3D globe (orthographic sphere) with a click-placed cursor that reads out its latitude (N/S) and longitude (E/W); plain-drag moves the cursor, shift-drag re-orients the globe. Optional overlays add named reference circles ("features") and world city markers ("cities"). No tropics / polar circles / seasonal geometry are drawn — this is a pure lat/long lab.

### Controls

| Control | Type | Default | Range/Step | Behavior/Notes |
|---|---|---|---|---|
| Cursor location (the "point location" marker) | Draggable on globe | **lat 40.8° N, lon 96.7° W** | lat −90…+90, lon 0…180 E / 0…180 W (any visible-hemisphere point) | Set at startup by `sphere.shores.instance.moveCursor({alt:40.8,az:96.7})` — `DefineSprite_130/frame_1/DoAction.as:132`. Placed by plain click/drag (`shoreDemo.as` `onPressFunc`/`updateMoveCursor`, 84–132). alt→latitude, az→longitude. |
| Globe orientation (θ, φ) | Draggable on globe (shift) | **θ = 290°, φ = 25°** | θ wraps mod 360; φ (tilt) clamped ±90 | `sphere.setThetaAndPhi(290,25)` — `DefineSprite_130/frame_1/DoAction.as:133`. Shift-drag (Key 16) rotates via `updateSimpleDragging` (`shoreDemo.as:226-245`); φ clamped to ±90 (`shoreDemo.as:232-239`, and `_maxPhi=90/_minPhi=-90` in `CelestialSphere.as:12-13`). |
| decimal | Radio (group `formatGroup`, data `"d"`) | **selected** (`initialState=true`) | — | `changeHandler="updateStrings"`. `.../PlaceObject2_88_FRadioButtonSymbol_28/CLIPACTIONRECORD on(initialize).as`. |
| sexagesimal | Radio (group `formatGroup`, data `"s"`) | unselected (`initialState=false`) | — | Switches readouts to D°M' N/S form. `.../PlaceObject2_88_FRadioButtonSymbol_34/CLIPACTIONRECORD on(initialize).as`. |
| show cities | Checkbox | **off** (`initialValue=false`) | — | `changeHandler="changeShowCities"`; toggles the 20 city dots. `.../PlaceObject2_121_FCheckBoxSymbol_3/CLIPACTIONRECORD on(initialize).as`. |
| show features | Checkbox | **off** (`initialValue=false`) | — | `changeHandler="changeShowFeatures"`; toggles Equator, Prime Meridian, International Date Line + their labels (and swaps the bright equator for a faint gray one). `.../PlaceObject2_121_FCheckBoxSymbol_9/CLIPACTIONRECORD on(initialize).as`. |
| open Google Maps | Push button | — | — | `clickHandler="openGoogle"` → opens `http://maps.google.com/maps?q=<lon><latDir>+<lat><latDir>&...&t=k` in window `googleMapPage`. `.../PlaceObject2_91_FPushButtonSymbol_17/CLIPACTIONRECORD on(initialize).as`; `DefineSprite_130/frame_1/DoAction.as:21-28`. |

Note: there is **no Reset button** and **no lat/long sliders** — location is only set by clicking the globe.

#### Reference circles drawn (all in `DefineSprite_130/frame_1/DoAction.as`)

| Circle | Def line | Color (hex) | Alpha | Toggle | Notes |
|---|---|---|---|---|---|
| Prime Meridian | :112 | 0xFF8339 (16745273) | 70 | "show features" | Great semicircle poles-to-poles at az 0 (`tilt:90, gamma −90…90`). Label "Prime Meridian" at alt 45 (:108). |
| Equator (bright) | :113 | 0x478930 (4688176) | 70 | "show features" | Horizontal great circle (`tilt:0`). Label "Equator" (:105). |
| International Date Line (IDL) | :91 (loop) | 0xFF8339 (16745273) | 70 | "show features" | Poly-arc through 25 vertices (`IDL[]`, :126); label "International\nDate Line" at alt 30 az 180 (:110). |
| grayEquator | :116 | 0x505050 (5263440) | 10 | shown when features **off** (`visible=!tmp`) | Faint equator replacement. |
| meridian1 / meridian2 | :114–115 | 0x505050 (5263440) | 10 | always on | Two faint great-circle "grid" meridians (az 0 and az 90). |
| latCircle | :121 | 0x909090 (9474192) | 50 | always (follows cursor) | Full parallel through cursor latitude. |
| longCircle | :122 | 0x909090 (9474192) | 50 | always (follows cursor) | Full meridian through cursor longitude. |
| latArc | :123 | latColor 0x4B4BFE (4934654) | 100 | follows cursor | Thick (3px) blue arc equator→cursor along its meridian. |
| longArc | :124 | longColor 0xFE4B4B (16665419) | 100 | follows cursor | Thick (3px) red arc along equator to cursor longitude. |

There are **NO tropics (±23.4°), NO polar/arctic circles (±66.6°)** and **no full lat/long graticule** — confirmed by grep over the setup (only the circles above are `addCircle`'d; searches for 23.4/66.5/tropic/arctic/polar returned nothing but the shore-outline data). The only always-on "grid" is the two faint gray meridians + the cursor's own lat/long circles.

Cities: 20 hardcoded (`cityList`, `DefineSprite_130/frame_1/DoAction.as:125`), placed via `sphere.addObject("City Dot",…,{az:-lon,alt:lat,r:0.99})` (:79). Hover/rollover shows a city-name label (`City Dot.as`, `City Label.as`).

### Readouts & formatting

Two live readouts under the "point location" heading (`DefineSprite_130/frame_1/DoAction.as` `updateStrings`, 1–20): `latitudeField` then `longitudeField`. Matching colored labels are also drawn on the globe (`latLabel` blue, `longLabel` red).

- **Decimal mode** (`formatGroup=="d"`): value = `toFixed(x,1)` (1 decimal place) + `"° "` + hemisphere letter.
  - Latitude: `alt>0 → "N"`, else `Math.abs(alt)` + `"S"` (`shoreDemo.as:154-165`). Example poster value: `40.8° N`.
  - Longitude: `az>180 → value=360−az, "E"`; else `value=az, "W"` (`shoreDemo.as:140-153`). Example: `96.7° W`.
  - `toFixed` is a custom rounding formatter, not JS's (`shoreDemo.as:306-351`).
- **Sexagesimal mode** (`formatGroup=="s"`): string is `"D° MM' <dir>"` — integer degrees, then minutes **zero-padded to 2 digits**, then hemisphere letter. Seconds ARE computed (`isec`) but are **not** appended (`shoreDemo.as:166-204`). e.g. lat 40.8 → `40° 48' N`.
- Degree glyph is the literal `°` (U+00B0) in every readout. Longitude is quoted W/E (never signed); latitude N/S (never signed). Google-Maps URL strips the degree glyph (`96.7W+40.8N`, :24-26).

### Constants & math

- **Globe radius** `r = _c.r = 150` px; diameter `size = 300`. `CelestialSphere.as:14` sets `_c.r=150`; `DefineSprite_130/frame_1/DoAction.as:99` sets `sphere.size=300` (and `size` setter does `r = size/2`). `shoreDemo` constructor separately holds `size=300` (`shoreDemo.as:6`). Shore-outline polylines rendered in silver 0xC0C0C0, 1px (`shoreDemo.as:17`), `polyLimit=25` polys/pass.
- **Angle constants:** deg→rad `0.017453292519943295`, rad→deg `57.29577951308232`, hour factors `0.2617993877991494` / `3.819718634205488` (celestial only, unused for globe).
- **Orthographic projection** (`3 CS Geometry.as:302-318` `doA`; identical in `shoreDemo.as:290-305`). For viewer angles θ (`_theta`, longitude spin) and φ (`_phi`, tilt), with world unit vector (x,y,z):
  - `a0=-r·sinθ, a1=r·cosθ`
  - `a3=r·cosθ·sinφ, a4=r·sinθ·sinφ, a5=-r·cosφ`
  - `a6=r·cosθ·cosφ, a7=r·sinθ·cosφ, a8=r·sinφ`
  - screen_x = `x·a0 + y·a1`; screen_y = `x·a3 + y·a4 + z·a5`; depth = `x·a6 + y·a7 + z·a8`. A point is back-facing / culled when depth `< 0` (`shoreDemo.as:47,56`; visible cities require `_sp.z > 0`, `shoreDemo.as:114`).
- **(lat, lon) → 3D unit vector** (`parsePointInput`, `3 CS Geometry.as:121-137`), using `az = -lon` and `alt = lat` (`DefineSprite_130/frame_1/DoAction.as:79`):
  - `d = cos(alt)`, `x = d·cos(az)`, `y = d·sin(-az)`, `z = sin(alt)` (angles in rad; r usually 1, cities use r=0.99).
- **Screen → (alt, az) inverse** (`StoMH`, `3 CS Geometry.as:269-301`; wrapped by `getMouseAltAz`, `4 CS Mouse.as:2-18`): off-globe (returns null) when `sqrt(x²+y²) > r`. Otherwise spherical back-projection using tilt `c = π/2 − φ`; then `alt` in degrees is latitude, `az = (360 − az_deg) mod 360`, and longitude is derived from az by the E/W rule above.
- **Drag kinematics** (`shoreDemo.as:226-245`, mirrored in `4 CS Mouse.as:83-87`): `newθ = θ0 − Δx_mouse / r` (rad), `newφ = φ0 + Δy_mouse / r` (rad); θ wrapped mod 360, φ clamped ±90.
- **Vestigial shared-code defaults** (overridden, not used by the globe): `CelestialSphere.as:43-44` `setThetaAndPhi(90,30)` and `setLatitude(41)` from the constructor; `_phi` init `0.5235987755982988` (=30°). The globe uses only the horizon (alt/az) system; `sphere.setMouseBehavior("none")` (`DefineSprite_130/frame_1/DoAction.as:100`) disables the sphere's built-in drag so `shoreDemo`/`shores` owns all mouse interaction. `showHorizonPlane=false`, `sortObjects=true` (:101-102).

### What is draggable

- **Plain click / drag on globe** → moves the cursor (point location) to the mouse's alt/az (`shoreDemo.updateMoveCursor`, 103-132). Also probes city dots for hover labels.
- **Shift + drag on globe** (Key 16) → rotates the globe orientation (θ, φ) (`shoreDemo.onPressFunc` 84-101 + `updateSimpleDragging` 226-245). Matches poster caption "click on the globe to change the cursor location; shift-click to change the globe's orientation".
- City dots respond to rollover/rollout (show/hide name label) and delegate press to the globe's cursor handler (`City Dot.as:22-27`).

### Source files cited

- `NAAP/decompiled/longLatDemo014/scripts/%3Cdefault package%3E/shoreDemo.as` (main globe/cursor class, projection, readout formatting, toFixed)
- `NAAP/decompiled/longLatDemo014/scripts/DefineSprite_130/frame_1/DoAction.as` (main setup: defaults, all `addCircle`/`addObject`, `updateStrings`, `openGoogle`, `changeShowFeatures`, `changeShowCities`, `cityList`, `IDL`)
- `NAAP/decompiled/longLatDemo014/scripts/DefineSprite_130/frame_1/PlaceObject2_88_FRadioButtonSymbol_28/CLIPACTIONRECORD on(initialize).as` (decimal radio)
- `NAAP/decompiled/longLatDemo014/scripts/DefineSprite_130/frame_1/PlaceObject2_88_FRadioButtonSymbol_34/CLIPACTIONRECORD on(initialize).as` (sexagesimal radio)
- `NAAP/decompiled/longLatDemo014/scripts/DefineSprite_130/frame_1/PlaceObject2_121_FCheckBoxSymbol_3/CLIPACTIONRECORD on(initialize).as` (show cities)
- `NAAP/decompiled/longLatDemo014/scripts/DefineSprite_130/frame_1/PlaceObject2_121_FCheckBoxSymbol_9/CLIPACTIONRECORD on(initialize).as` (show features)
- `NAAP/decompiled/longLatDemo014/scripts/DefineSprite_130/frame_1/PlaceObject2_91_FPushButtonSymbol_17/CLIPACTIONRECORD on(initialize).as` (open Google Maps)
- `NAAP/decompiled/longLatDemo014/scripts/DefineSprite_130/frame_1/PlaceObject2_92_CelestialSphere_1/CLIPACTIONRECORD on(initialize).as` (sphere init)
- `NAAP/decompiled/longLatDemo014/scripts/%3Cdefault package%3E/CelestialSphere.as` (shared sphere ctor: r=150, phi bounds, vestigial θ/φ/lat)
- `NAAP/decompiled/longLatDemo014/scripts/%3Cdefault package%3E/2 CS Getter Setter.as` (θ/φ/size/latitude getters-setters, clamps)
- `NAAP/decompiled/longLatDemo014/scripts/%3Cdefault package%3E/3 CS Geometry.as` (`doA`, `parsePointInput`, `WtoSz`, `StoMH`)
- `NAAP/decompiled/longLatDemo014/scripts/%3Cdefault package%3E/4 CS Mouse.as` (`getMouseAltAz`, drag behaviors)
- `NAAP/decompiled/longLatDemo014/scripts/%3Cdefault package%3E/City Dot.as`, `.../City Label.as` (city markers/labels)
- Poster: `NAAP/naap-air-app/files/motion1/animations/tc_globe.jpg`

---

## simpleFlatSkyMap007 (cec_flat — Celestial Flat Sky Map)

Flat RA×Dec sky chart: click (or drag) to place a cursor whose RA/Dec is read out in decimal or sexagesimal; shift-click-drag or arrow buttons pan the map in RA; five checkboxes toggle overlays (zodiac constellations, ecliptic, celestial equator, galactic equator, equinoxes/solstices).

### Controls

| Control | Type | Default | Range/Step | Behavior/Notes |
|---|---|---|---|---|
| Sky-map cursor ("point location") | Click/drag on map | RA 8.5 h, Dec +35° | RA 0–24 h; Dec −90…+90° | `Flat Sky Map.as` ctor `this.moveCursor({dec:35,ra:8.5})` (L23). Click sets cursor (`onMouseDown`→`moveCursor`, L90-110); plain drag moves it continuously (`moveCursorOnMouseMoveFunc`, L118). Two cursor copies `cursor1MC`/`cursor2MC` for the wrapped map. |
| Map RA pan (shift-drag) | Shift+drag on map | offset 16.5 h | wraps mod 24 h | `onMouseDown` gated by `Key.isDown(16)` (shift) (L92); `adjustOffsetOnMouseMoveFunc` newOffset = initOffset + Δx·0.0342857 (24/700 h per px) (L112-117). Initial `setRAOffset(16.5)` (L22). |
| "shift map" ← button | Push button | label "" | +3 h step | `PlaceObject2_121_FPushButtonSymbol_44` clickHandler `shiftLeft`; `DoAction.as` `shiftLeft()`→`doShift(3)` (L42-45). Animated ease `u^0.4` over `totalTime=400` ms (L21-41, L75). |
| "shift map" → button | Push button | label "" | −3 h step | `PlaceObject2_121_FPushButtonSymbol_51` clickHandler `shiftRight`; `shiftRight()`→`doShift(-3)` (L46-49). |
| show zodiac constellations | Checkbox | **false (off)** | on/off | `PlaceObject2_124_FCheckBoxSymbol_31` label " show zodiac constellations", `initialValue=false`, handler `changeShowConstellations`→`setShowConstellations` toggles `constellationsMC._visible` (`Flat Sky Map.as` L250-253). Ctor also forces off (L17). |
| show ecliptic | Checkbox | **false (off)** | on/off | `..._19` label " show ecliptic", handler `changeShowEcliptic`→`setShowEcliptic` toggles `rightAscensionFeaturesMC.ecliptic` + `.eclipticLabels` (L259-263). Ctor off (L18). |
| show celestial equator | Checkbox | **false (off)** | on/off | `..._13` label " show celestial equator", handler `changeShowCelestialEquator`→`setShowCelestialEquator` toggles `declinationFeaturesMC._visible` (the Dec=0 line) (L264-267). Ctor off (L19). |
| show galactic equator | Checkbox | **false (off)** | on/off | `..._7` label " show galactic equator", handler `changeShowGalacticEquator`→`setShowGalacticEquator` toggles `rightAscensionFeaturesMC.galacticEquator` + `.galacticEquatorLabels` (L268-272). Ctor off (L20). |
| show equinoxes and solstices | Checkbox | **false (off)** | on/off | `..._25` label " show equinoxes and solstices", handler `changeShowEqsAndSols`→`setShowEquinoxesAndSolstices` toggles `equinoxesAndSolstices1MC`/`2MC._visible` (L254-258). Ctor off (L21). |
| Readout format: decimal / sexagesimal | Radio group `formatGroup` | **decimal** ("d") | d / s | `..._59` label " decimal" data "d" `initialState=true`; `..._65` label " sexagesimal" data "s" `initialState=false`. Handler `onMouseClick`; format branch `DoAction.as` L52-61. |

Note: `DoAction.as` `changeShowFeatures()`/`showFeaturesCheck`/`setShowFeatures` (L69-71) is **dead leftover code** — no matching checkbox clip-action and no `setShowFeatures` method exists in `Flat Sky Map.as`. Flag for the port; ignore.

Poster caveat: `cec_flat.jpg` shows a marketing state (RA 7.6 h, Dec −57.6°, ecliptic + constellations visible). The **code defaults differ** and are authoritative: RA 8.5 h, Dec +35°, all overlays off, decimal format.

### Readouts & formatting

- **RA decimal** (`getStrings`, `Flat Sky Map.as` L237-249): `rightAscensionDecimalString = pt.ra.toFixed(1)` → 1 decimal, suffixed `" h"` in `DoAction.as` L55 → e.g. `"8.5 h"`.
- **Dec decimal**: `declinationDecimalString = pt.dec.toFixed(1)` → 1 decimal, suffixed `"° "` (L54) → e.g. `"35.0° "`.
- **RA sexagesimal**: `rightAscensionDMSString = floor(ra) + " h " + round((ra−floor(ra))·60) + " min"` (L244-247) → e.g. `"8 h 30 min"`.
- **Dec sexagesimal**: `declinationDMSString = floor(dec) + "° " + round((dec−floor(dec))·60) + "’"` (L242-246) → e.g. `"35° 0’"`. Uses `Math.floor`, so negative Dec rounds toward −∞ (e.g. −57.6 → "−58° 24’").
- On-map floating labels (`raLabel1/2MC`, `decLabel1/2MC`) are set to decimal in `moveCursor` (L163-166) but immediately re-set to the selected format by `onMouseClick` (L64-67), so they follow the radio choice.
- **RA axis direction: RA increases to the LEFT.** `pt.ra = raOffset − x·(24/700)` (L200): larger screen x → smaller RA. Top axis reads L→R 15,12,9,6,3,0,21,18 h (poster + `setRAOffset` label loop decrementing 3 h per step, L184-191).
- **Dec axis: increases UPWARD** (top = +90°, bottom = −90°). `pt.dec = y·(−90/175)` (L201): y=−175 (top)→+90°, y=+175 (bottom)→−90°.

### Constellation data

- File: `%3Cdefault package%3E/Constellations Data.as` — **1 line, 4397 bytes.** Single assignment `_root.constellationsData = [ {…}, … ]`.
- **Count: 12 constellations** (12 `path:`/`radius:`/`center:`/`stars:` — one each). These are the zodiac figures, but **no name strings exist anywhere** in the data or scripts (searched Aries…Pisces/zodiac/`name:` — zero hits). The 12 correspond to the zodiac by position only; names must be assigned in the port by inspecting geometry.
- **Shape:** each element = `{path:[...], radius:Number, center:{x,y,z}, stars:[{x,y},...]}`.
  - `stars`: array of **screen-pixel** points `{x,y}` (NOT ra/dec, NOT hours/degrees) already projected into the flat-map coordinate frame — same 700-px-wide / y∈[−175,+175] space as the map (e.g. x up to ~727, y small). To recover RA/Dec, invert the map mapping: `ra = raOffset − x·(24/700)` (mod 24), `dec = y·(−90/175)`. (These stored x already include the map's internal offset; the draw code also renders shifted copies at `x`, `x+700`, and for index 7 `x−700` to wrap — `Flat Sky Map.as` L54-86.)
  - `center`: a unit 3-vector `{x,y,z}` (direction cosines of the figure centroid on the celestial sphere) — the true angular reference; `radius`: angular size (radians).
  - `path`: array of edge-runs `{m, b, e}` = polyline segments over the `stars` index list: `moveTo(stars[m])`, then `lineTo(stars[k])` for k = b … e−1 (`initializeConstellations`, L40-51). This is how connecting lines/edges are encoded.
- **Representative entries (verbatim, first two):**
  - `{path:[{m:3,b:0,e:9},{m:7,b:9,e:12},{m:9,b:12,e:13},{m:9,b:13,e:15},{m:13,b:0,e:1},{m:13,b:5,e:6},{m:13,b:15,e:16}],radius:0.314,center:{x:-0.882,y:0.3367,z:0.3296},stars:[{x:415.2,y:-46.2},{x:422.1,y:-44.7}, … {x:417.5,y:-19.2}]}`  (16 stars)
  - `{path:[{m:0,b:1,e:10},{m:7,b:10,e:12}, …],radius:0.206,center:{x:-0.2192,y:0.8859,z:0.4089},stars:[{x:523,y:-45.2}, … {x:474.2,y:-47.4}]}`  (18 stars)
- Lines drawn white (`lineStyle(1,16777215,60)`, L31), duplicated at +700 px for all, and −700 px only for constellation index 7 (the one straddling the RA=0 seam), L69-86.

### Constants & math (`Flat Sky Map.as`)

Map is 700 px wide (24 h) × 350 px tall (180°), y∈[−175,+175], x∈[0,700]; a second copy sits at +700 px for seamless RA wrap.

- **px per hour (RA):** `29.166666666666668` = 700/24 (L178, L183, L220).
- **h per px (RA):** `0.03428571428571429` = 24/700 (L114, L200).
- **px per degree (Dec):** `1.9444444444444444` = 175/90 (used as `dec·−1.9444` for screen y, L224).
- **deg per px (Dec):** `0.5142857142857142` = 90/175 (used as `y·−0.5142857`, L201).
- Screen→sky (`addSkyMapCoords`, valid x∈[0,700], y∈[−175,175], L194-213): `ra = ((raOffset − x·24/700) %24 +24)%24`; `dec = y·(−90/175)`.
- Sky→screen (`addScreenCoords`, valid dec∈[−90,90], L214-236): `x = (24 − ra)·(700/24)`, wrapped mod 700 → `x1=x`, `x2=x+700`; `y = dec·(−175/90)`.
- **RA offset / pan** (`setRAOffset`, L173-193): `_raOffset = (arg%24+24)%24`; `skyMapMC._x = raOffset·29.1667 − 700`; `declinationFeaturesMC._x = −skyMapMC._x` (celestial-equator line stays put while map scrolls); RA labels `raLabelsMC` are 8 strings (`str0..str7`), value `3·floor(raOffset/3)` decrementing **3 h** per label → **RA grid/label spacing = 3 hours** (L182-191).
- **Dec grid spacing = 30°** (poster axis +90/+60/+30/0/−30/−60/−90). **Not found in ActionScript** — declination grid lines/labels are static timeline art (no `decDivisions`/`decLabels` script), so 30° is inferred from the poster; flag for confirmation.
- **Great circles** (`Flat Sky Map RA Features.as` ctor, L1-6): ecliptic `drawGreatCircle("ecliptic", theta=90, phi=66.6, white)` (phi = 90−23.4 obliquity); galactic equator `drawGreatCircle("galacticEquator", theta=167.75, phi=27.4, color 0xFFC0FF)`. `drawGreatCircle` fits a sinusoid via `C=1/tan(phi)`, k=700/2π, 6 curveTo segments, duplicated ×12 across the map (L9-80).
- **Cursor guide lines** (`moveCursor`, L144-155): drawn from RA=0 baseline (x=700) horizontally to cursor x then vertically to cursor y, color 0xFFD8E0 (`16772640`), the yellow α/δ leader lines in the poster.

### Source files cited

- `NAAP/decompiled/simpleFlatSkyMap007/scripts/%3Cdefault package%3E/Flat Sky Map.as` (ctor L1-24; `moveCursor` L132-168; `setRAOffset` L169-193; `addSkyMapCoords` L194-213; `addScreenCoords` L214-236; `getStrings` L237-249; setShow* L250-272; `initializeConstellations` L27-89; `onMouseDown`/pan L90-131)
- `NAAP/decompiled/simpleFlatSkyMap007/scripts/%3Cdefault package%3E/Flat Sky Map RA Label.as` (`setLabel` writes `innerMC.raField.text`)
- `NAAP/decompiled/simpleFlatSkyMap007/scripts/%3Cdefault package%3E/Flat Sky Map Declination Label.as` (`setLabel` writes `innerMC.decField.text`)
- `NAAP/decompiled/simpleFlatSkyMap007/scripts/%3Cdefault package%3E/Flat Sky Map RA Features.as` (ecliptic + galactic-equator great circles)
- `NAAP/decompiled/simpleFlatSkyMap007/scripts/%3Cdefault package%3E/Constellations Data.as` (12-constellation array; 4397 bytes, 1 line)
- `NAAP/decompiled/simpleFlatSkyMap007/scripts/frame_1/DoAction.as` (checkbox/radio handlers, shift, `onMouseClick` formatting, `totalTime=400`)
- `NAAP/decompiled/simpleFlatSkyMap007/scripts/frame_1/PlaceObject2_124_FCheckBoxSymbol_{7,13,19,25,31}/CLIPACTIONRECORD on(initialize).as` (checkbox labels/defaults)
- `NAAP/decompiled/simpleFlatSkyMap007/scripts/frame_1/PlaceObject2_118_FRadioButtonSymbol_{59,65}/CLIPACTIONRECORD on(initialize).as` (decimal/sexagesimal radios)
- `NAAP/decompiled/simpleFlatSkyMap007/scripts/frame_1/PlaceObject2_121_FPushButtonSymbol_{44,51}/CLIPACTIONRECORD on(initialize).as` (shift-map buttons)
- `NAAP/naap-air-app/files/motion1/animations/cec_flat.jpg` (poster; axis directions, Dec 30° spacing)

---

## skyMap028 (cec_sky — Celestial Sky Explorer sphere)

One-line summary: A rotatable celestial sphere (observer fixed at the N celestial pole, 180° FOV) rendering ~9,000 catalog stars; **click on the sphere** moves a draggable cursor "point" that draws yellow RA hour-circle + Dec-circle guide arcs and reports RA/Dec, while **shift-click drags** re-orient (rotate) the sphere. Six overlay checkboxes (equator/ecliptic/equinoxes/galactic/poles/zodiac) + a decimal↔sexagesimal readout radio pair. No Reset/play controls.

### Controls

| Control | Type | Default | Range/Step | Behavior/Notes |
|---|---|---|---|---|
| decimal | Radio (group `formatGroup`, data `"d"`) | **selected** (`initialState = true`) | — | Switches RA/Dec readouts to decimal. `changeHandler = "updateStrings"`. `PlaceObject2_120_FRadioButtonSymbol_3`. |
| sexagesimal | Radio (group `formatGroup`, data `"s"`) | unselected (`initialState = false`) | — | Switches readouts to H M / ° ' form. `PlaceObject2_120_FRadioButtonSymbol_9`. |
| show celestial equator | CheckBox | **unchecked** (`initialValue = false`) | — | `changeHandler = "changeShowCelestialEquator"`. Equator circle is ALWAYS drawn but faint (alpha 20); checking raises alpha to 100 and shows its label. `..._FCheckBoxSymbol_32`; DoAction L58-73,115. |
| show ecliptic | CheckBox | **unchecked** | — | `changeShowEcliptic`; toggles `sphereMC.ecliptic.visible` + eclipticLabel. Circle added with `{tilt:23.4, ra:12, dec:0}`, white. `..._38`; DoAction L89-103,116. |
| show equinoxes and solstices | CheckBox | **unchecked** | — | `changeShowEqsAndSols`; toggles veLabel/aeLabel/ssLabel/wsLabel. `..._44`; DoAction L28-39. |
| show galactic equator | CheckBox | **unchecked** | — | `changeShowGalacticEquator`; toggles galacticEquator + label. Circle `{tilt:62.6, ra:17.1833, dec:0}`, color 16764159 (pale blue). `..._26`; DoAction L74-88,117. |
| show celestial poles | CheckBox | **unchecked** | — | `changeShowPoles`; toggles northPoleLabel/southPoleLabel. `..._50`; DoAction L18-27. |
| show zodiac constellations | CheckBox | **unchecked** | — | `changeShowConstellations`; sets `sphereMC.stars.instance.showConstellations` and redraws constellation lines (13 constellations hard-coded in `Symbol 1.as` `constellationsData`). `..._20`; DoAction L104-108. |
| Sphere body — plain click/drag | Mouse (canvas) | — | — | `4 CS Mouse.as` `startCustomBehavior` (L45): if Shift NOT down → `updateMoveCursor` → moves the yellow cursor point to the clicked RA/Dec. This is the "star"/point drag. |
| Sphere body — shift-click/drag | Mouse (canvas) | — | — | `4 CS Mouse.as` `startCustomBehavior` (L47 `Key.isDown(16)`) → `updateSimpleDragging` (L200): changes sphere `_theta`/`_phi` (re-orients the sphere). Matches poster caption "shift-click to change the sphere's orientation". |

Notes / flags:
- **No Reset, no play/pause, no sliders, no combo box.** The poster's "geometry: viewing perspective → celestial sphere" is a static illustration, not a control.
- **Poster vs. source-default discrepancy (flag):** the poster JPEG shows *decimal* selected (matches), but also shows "show zodiac constellations" CHECKED and the readout at Dec 55.3° / RA 8.2h. The decompiled source makes ALL six checkboxes default `false` and sets the cursor to RA 8.0h / Dec 60.0° (see below). The poster is an illustrative post-interaction state; the authoritative code default is all-unchecked.

### Readouts & formatting

Two text fields under "point location": `raField` ("right ascension") and `decField` ("declination"); the same strings are mirrored onto on-sphere labels `raLabel`/`decLabel` via `setLabel` (`RA Label.as`, `Declination Label.as`). `updateStrings()` (DefineSprite_134/frame_1/DoAction.as L1-17) picks decimal vs sexagesimal from `formatGroup.getValue()`. Formatting logic in `4 CS Mouse.as` `moveCursorTo` (L133-191):

- **Decimal RA:** `(((-ra) % 24 + 24) % 24).toFixed(1) + "h"` → e.g. `"8.0h"` (one decimal, hours).
- **Decimal Dec:** `dec.toFixed(1) + "°"` → e.g. `"60.0°"` (one decimal, degrees).
- **Sexagesimal RA:** integer hours + zero-padded integer minutes, `"8h 00m"` — **hours & minutes only, NO seconds**.
- **Sexagesimal Dec:** integer degrees + zero-padded arcminutes with sign, `"60° 00'"` / `"-23° 30'"` — **degrees & arcminutes only, NO arcseconds**.
- RA sign convention: displayed RA = `((-internalRA) % 24 + 24) % 24` (internal `mp.ra` is negated and wrapped to 0–24 h). Dec passed through directly, ±90°.
- `toFixed` is a custom polyfill (`toFixed.as`).

Guide arcs drawn while cursoring (`moveCursorTo` L177-185): `raArc` from RA 0 to the point's RA along the equator; `decArc` from the equator up/down to the point's Dec. Both are yellow (`addCircle` "decArc"/"raArc", color 16772640, thickness 3, alpha 80; DoAction L120-121).

### Star catalog data

Source: `Bright Star Catalog.as` (in `%3Cdefault package%3E/`). Assigns `_root.brightStarCatalog`.
- **File size:** 299,595 bytes, **1 line** (single minified array literal).
- **Structure (3-level, spatial-partition tree — NOT raw RA/Dec rows):**
  - Top level: array of **32 "super-discs"**, each `{x, y, z, r, discs:[…]}` — `x,y,z` = unit direction vector of the disc center on the sphere, `r` = angular radius (used for view-frustum culling in `Symbol 1.as updateStars`).
  - Each super-disc holds `discs:[…]`, each a sub-disc `{x, y, z, r, w0…w8, stars:[…]}` — `w0…w8` = a 3×3 rotation matrix orienting that disc's local star plane.
  - Each sub-disc holds `stars:[…]`, entries `{sx, sy, mag}` — `sx,sy` = pre-projected local screen coordinates (px) within the disc, `mag` = visual magnitude.
- **Per-star fields:** `sx` (Number, px), `sy` (Number, px), `mag` (Number, visual magnitude). **RA/Dec are NOT stored per star** — celestial position is baked into the disc `x,y,z` + `w0…w8` matrices. Magnitude drives rendering only: stars drawn iff `mag <= 5.8`, disc `Star` symbol scaled `10 * (7 - mag)` (`Symbol 1.as` `renderDisc` L159-162).
- **Star count:** **9,096 stars** (9096 `mag:` == 9096 `sx:` occurrences); 32 top-level `discs:` groups.
- Representative entries (verbatim, first sub-disc of first super-disc):
  - super-disc header: `{x:0.14612,y:0.45943,z:-0.87611,r:0.48148,discs:[…]}`
  - sub-disc header: `{x:0.016945,y:0.28324,z:-0.9589,r:0.14329,w0:-0.99822,w1:0.057266,w2:0.016945,w3:0.059721,w4:0.95719,w5:0.28324,w6:0,w7:0.28374,w8:-0.9589,stars:[…]}`
  - stars: `{sx:-124.2,sy:42.12,mag:7.26}` , `{sx:-91.47,sy:-31.99,mag:5.4}` , `{sx:134.9,sy:46.98,mag:3.24}`
- Separately, `Symbol 1.as` `constellationsData` (L368) hard-codes **13 zodiac constellations** as `{path, radius, center, stars:[{name, x, y, z}, …]}` for the "show zodiac constellations" line overlay (named Bayer-designation vertices with unit x,y,z).

### Constants & math

Engine is the shared RotatingSky `CelestialSphere` family (`CelestialSphere.as` + numbered `N CS *.as`); this port already has the engine, so math is only summarized.

- **On-screen sphere radius:** `sphereMC.size = 500` (DoAction L111) → `setSize` sets `_c.r = arg/2 = 250` px (`2 CS Getter Setter.as` L118-121). Constructor's initial `_c.r = 150` (`CelestialSphere.as` L14) is overridden. The star-rendering engine `Symbol 1.as` uses its own `p._r = 250` (L15).
- **Default sphere / camera orientation** (`DefineSprite_134/frame_1/DoAction.as` + constructor):
  - `_theta` = **90°** (azimuthal orientation) — set by `CelestialSphere` constructor `setThetaAndPhi(90,30)` (L43); NOT overridden in DoAction.
  - `_phi` = **30°** (viewer altitude / sphere tilt above horizontal) — same call; `_phi` also seeded to 0.5236 rad (=30°) at L17.
  - `latitude` = **90°** (`sphereMC.latitude = 90`, DoAction L113; observer at the north celestial pole → NCP at top). Constructor's `setLatitude(41)` is overridden.
  - `siderealTime` = **0 h** (DoAction L112).
  - `showHorizonPlane = false` (DoAction L114); `_showUnder = true` (constructor L16).
  - Star engine `Symbol 1`: `setSiderealTime(0)`, `setLatitude(90)`, `setFieldOfView(180)` (full-hemisphere, 180° FOV) — `Symbol 1.as` L6-8; `setCenterCoordinate(-theta, phi)` = `(-90, 30)` (DoAction L146).
- **Default cursor ("point"/star) location:** `sphereMC.moveCursorTo({ra:-8, dec:60})` (DoAction L147). Internal `ra:-8` → **displayed RA = 8.0h**; **displayed Dec = 60.0°** (sexagesimal `"8h 00m"` / `"60° 00'"`).
- **Conversion constants** (cited verbatim):
  - rad→deg = `57.29577951308232` (= 180/π; task's `57.2957795`) — throughout, e.g. `4 CS Mouse.as` L15, `Symbol 1.as` L98.
  - rad→hours = `3.819718634205488` (= 12/π; task's `3.8197186`) — `screenToCelestial` (`3 CS Geometry.as` L13), `getSiderealTime` (`2 CS Getter Setter.as` L134).
  - deg→rad = `0.017453292519943295` (π/180); hours→rad = `0.2617993877991494` (π/12); hours→deg factor `15` (raArc `gammaStart:15*mp.ra`).
  - Ecliptic obliquity encoded as `tilt:23.4`; ecliptic-label declination uses `atan(0.43273864224742586 * sin(...))` (= tan 23.4°), DoAction L48. Galactic pole tilt `62.6`, ra `17.1833`.
- **Coordinate conversions defined** (`3 CS Geometry.as`, engine present already): `screenToHorizon`, `screenToCelestial` (screen→RA/Dec), `toScreen`, `pointToHorizon`, `pointToCelestial`, `WtoS/WtoSz` (world→screen), `CtoS/CtoSz` (celestial→screen), `CtoW`, `WtoC`, `CtoMH`, `MHtoC` (horizon↔celestial via latitude+sidereal time), `StoMH` (screen→math-horizon). Mouse picking: `getMouseRaDec`/`getMouseDecRa`, `getMouseAltAz` (`4 CS Mouse.as` L2-35). Matrix builders `doA`/`doM`/`doB` present in both `CelestialSphere.as`/`3 CS Geometry.as` and (star engine) `Symbol 1.as`.

### Source files cited

- `NAAP/decompiled/skyMap028/scripts/%3Cdefault package%3E/Symbol 1.as` — star-rendering engine (`_r=250`, `initializeDiscs`, `updateStars`, `renderDisc` mag≤5.8 cull, `setLatitude/setFieldOfView(180)/setSiderealTime`, `setCenterCoordinate`, `constellationsData` = 13 zodiac constellations).
- `NAAP/decompiled/skyMap028/scripts/%3Cdefault package%3E/Bright Star Catalog.as` — `_root.brightStarCatalog`, 32 super-discs → sub-discs (w0–w8) → 9,096 `{sx,sy,mag}` stars; 299,595 bytes, 1 line.
- `NAAP/decompiled/skyMap028/scripts/%3Cdefault package%3E/RA Label.as`, `Declination Label.as` — `setLabel` on-sphere text mirrors of readouts.
- `NAAP/decompiled/skyMap028/scripts/%3Cdefault package%3E/4 CS Mouse.as` — `startCustomBehavior` (Shift→rotate sphere `updateSimpleDragging`, else move cursor `updateMoveCursor`), `moveCursorTo` (RA/Dec formatting: decimal `.toFixed(1)`, sexagesimal H/M and °/′), `getMouseRaDec`.
- `NAAP/decompiled/skyMap028/scripts/%3Cdefault package%3E/CelestialSphere.as` — constructor defaults (`_c.r=150`, `_phi=30°`, `setThetaAndPhi(90,30)`, `setLatitude(41)`, `_showUnder=true`), `_N=10000`, `update`.
- `NAAP/decompiled/skyMap028/scripts/%3Cdefault package%3E/2 CS Getter Setter.as` — `size`/`theta`/`phi`/`latitude`/`siderealTime` getters/setters (`setSize`→`_c.r=arg/2`).
- `NAAP/decompiled/skyMap028/scripts/%3Cdefault package%3E/3 CS Geometry.as` — coordinate conversions (screenToCelestial, CtoS, MHtoC, StoMH, etc.) and rad↔deg/hours constants.
- `NAAP/decompiled/skyMap028/scripts/DefineSprite_134/frame_1/DoAction.as` — top-level wiring: change handlers, `size=500`, `latitude=90`, `siderealTime=0`, circle/object additions (celestialEquator alpha20, ecliptic tilt23.4, galacticEquator tilt62.6, meridians, decArc/raArc yellow), `moveCursorTo({ra:-8,dec:60})`, initial `changeShow*()` calls.
- `NAAP/decompiled/skyMap028/scripts/DefineSprite_134/frame_1/PlaceObject2_117_FCheckBoxSymbol_{20,26,32,38,44,50}/CLIPACTIONRECORD on(initialize).as` — 6 checkbox labels + `initialValue=false` + changeHandlers.
- `NAAP/decompiled/skyMap028/scripts/DefineSprite_134/frame_1/PlaceObject2_120_FRadioButtonSymbol_{3,9}/…` — decimal (default) / sexagesimal radios, group `formatGroup`.
- `NAAP/decompiled/skyMap028/scripts/%3Cdefault package%3E/FCheckBoxSymbol.as`, `FRadioButtonSymbol.as`, `toFixed.as` — UI component + polyfill classes.
- Poster: `NAAP/naap-air-app/files/motion1/animations/cec_sky.jpg`.

---

## eclipticSimulator025 (seasons_ecliptic — Seasons and Ecliptic Simulator)

**Summary:** The most control-rich NAAP explorer. A left "orbit view" (Sun-centered, Earth dragged around the orbit with a fixed-direction 23.4° tilted axis; switchable to an Earth-centered "celestial sphere" with ecliptic + celestial equator), a top-right Earth close-up (day/night terminator, subsolar point, draggable observer latitude), a bottom-right sunbeam / angle-of-incidence panel, live sun declination + right-ascension + noon-altitude readouts, a full-year day slider with play/pause + month ticks, a latitude selector, and 3 radio-button pairs + 3 checkboxes.

**Panels / layout (from the two posters):**
- **Top-left — Orbit view** ("click and drag to change perspective" / "click and drag the earth to change its position on the orbital path"): Sun icon at centre, Earth (small globe with tilted red/blue axis) on a white elliptical orbit; a light "ray" points Sun→Earth. Bottom-left readouts: `sun's declination: -19.7°` and `sun's right ascension: 20.3h`, a ` labels` checkbox, radio pair `orbit view` / `celestial sphere`, and a ` show subsolar point` checkbox at the very bottom-left.
- **Top-right — Earth close-up** ("click and drag the earth…" / "click and drag the stickfigure circle to change the observer's latitude"): a large Earth showing the illuminated/dark hemispheres and the terminator; `observer's latitude: 10.0° N` readout; a ` labels` checkbox; two radio pairs `sunbeam spread` / `sunlight angle` and `view from sun` / `view from side`; `sun altitude: 46.3°` and `observer latitude: 10.0°` readouts.
- **Bottom-right — Sunbeam panel:** either a top-down grid with a light-spot ("sunbeam spread") or a side view of parallel sun rays striking a horizon at the sun's altitude ("sunlight angle", the default). A play/pause (◄►) transport sits at its bottom-left.
- **Bottom — Year slider:** horizontal slider with month tick labels `Jan … Dec`, a date readout (poster: `21 January`), and a `start animation` push button.
- Title bar "Seasons and Ecliptic Simulator" with `reset` / `help` / `about` links.

Note: the poster screenshots are illustrative (they show day-of-year 20 = "21 January", latitude ~default). The coded `onReset()` defaults differ (day 40 = "10 February"); see below.

### Controls (all)

| Control | Type | Default | Range/Step | Behavior / Notes |
|---|---|---|---|---|
| Year / day slider (`daySlider`, "Modified Year Slider") | slider | **day-of-year 40 → "10 February"** (set by `onReset`; the symbol's own `initValue`=0) | min 0, max 364, precision 0 (integer days); ticks at month boundaries `[0,31,59,90,120,151,181,212,243,273,304,334,365]`, labels Jan…Dec; **year starts January** (day 0 = "1 January") | `changeHandler="changeDayOfYear"`. Value is a 0-based day-of-year index, NOT a date object. `changeDayOfYear(arg)` sets `daysSinceVE = arg + 286` and the text via `getDayString`. |
| `start animation` button (`animateButton`) | push button | label "start animation" | — | `clickHandler="toggleAnimation"`; toggles play; relabels to "stop animation" while running. Single button = play/pause, **no speed control**. |
| Observer feature: **sunlight angle** | radio (`observerFeatureGroup`, data `"angle"`) | **selected (checked)** — `initialState=true`; `onReset` forces `observerFeatureGroup.setValue("angle")` | group of 2 | Shows the **side-view sunbeam** panel (`sunlightAngleViewMC`, angle-of-incidence rays). `changeObserverFeature`. |
| Observer feature: sunbeam spread | radio (`observerFeatureGroup`, data `"spread"`) | unchecked (`initialState=false`) | group of 2 | Shows the **top-down grid** panel (`sunbeamViewMC`) + `sunbeamSpreadDirectionLabelsMC`. |
| View type: **view from side** | radio (`viewTypeGroup`, data `"side"`) | **selected** — `initialState=true`; `onReset` forces `viewTypeGroup.setValue("side")` | group of 2 | Earth close-up seen edge-on (terminator profile); **latitude-selector stickfigure visible & draggable**, side-view rays visible, side subsolar point. `setEarthViewType`. |
| View type: view from sun | radio (`viewTypeGroup`, data `"sun"`) | unchecked | group of 2 | Earth close-up seen from the Sun (full lit disc); latitude changed by dragging the red latitude circle on the globe. |
| Centered object: **orbit view** | radio (`centeredObjectGroup`, data `"sun"`) | **selected** — `initialState=true`; `onReset` forces `centeredObjectGroup.setValue("sun")` | group of 2 | Sun at centre, Earth orbits; orbital path + orbital-plane arcs drawn; Earth (globe) is draggable around orbit. `changeCenteredObject`. |
| Centered object: celestial sphere | radio (`centeredObjectGroup`, data `"earth"`) | unchecked | group of 2 | Earth at centre inside a celestial sphere; celestial equator, ecliptic, NCP/SCP markers, meridians shown; Sun icon draggable along ecliptic. |
| ` labels` (orbit view) (`showOrbitViewLabelsCheck`) | checkbox | **unchecked** — `initialValue=false`; `onReset` `setValue(false)` | — | `changeShowOrbitViewLabels`. In orbit view shows orbit-path + direction labels (to VE/SS/AE/WS); in celestial-sphere mode shows celestial-equator / ecliptic / NCP / SCP labels. Label text white (`textColor 0xFFFFFF`). |
| ` labels` (earth view) (`showEarthViewLabelsCheck`) | checkbox | **unchecked** — `initialValue=false`; `onReset` `setValue(false)` | — | `changeShowEarthViewLabels`. Shows Tropic of Cancer/Capricorn, Equator, Arctic/Antarctic Circle, North/South Pole labels on the close-up globe. |
| ` show subsolar point` (`showSubSolarPointCheck`) | checkbox | **CHECKED** — `initialValue=true`; `onReset` `setValue(true)` | — | `changeShowSubsolarPoint`. Shows the subsolar-point marker on both globes (orbit-view globe + earth close-up). |
| Latitude selector (`latitudeSelector`, stickfigure on a circle) | drag control | **latitude 10° N** (`onReset` `changeLatitude(10)`; symbol's own `initLat`=45) | −90…+90 (clamped in stickfigure `onMouseMoveFunc` and `setLatitude`); continuous | `changeHandler="changeLatitude"`, `radius=75` px. Only visible in "view from side"; in "view from sun" latitude is set by dragging the globe's red latitude circle. |
| Earth-drag on orbit (globe) / Sun-drag (celestial sphere) | drag | — | day-of-year 0…364 wraps | Dragging the globe (orbit view) or Sun icon (celestial sphere) calls `changeDayOfYear` — i.e. moves the date, not a free angle. |
| Perspective drag (`orbitViewBackgroundMC`) | drag | azimuth 270°, altitude 30° (`onReset`) | — | Rotates the 3-D orbit-view camera (theta/phi). |
| reset / help / about | title-bar links | — | — | `reset` → `onReset` (see `PlaceObject…Title Bar…on(initialize)` `resetHandlerFunc="onReset"`). |

### Readouts & formatting

All in `update()` / `changeDayOfYear` / `changeLatitude` of the main sprite `DoAction.as`.

- **Date** (`dayOfYearField`): `getDayString(doy)` → `"<day-of-month> <MonthName>"`, e.g. `"10 February"`. Full month name, no year. Default `"10 February"`. (`getDayString`, `monthLabels`, `monthPoints`.)
- **Sun's declination** (`decField`): `_loc3_.alt.toFixed(1) + "°"` → 1 decimal, signed, e.g. `-19.7°`. (`update` L136/138, L155/157.) Value = sun's equatorial declination δ.
- **Sun's right ascension** (`raField`): `_loc5_.toFixed(1) + "h"` where `_loc5_ = ((-6 - _loc3_.az/15) % 24 + 24) % 24`, clamped to ≤ 23.94 → range [0.0, 23.9] h, 1 decimal, e.g. `20.3h`. (`update` L130-137.)
- **Sun's altitude / noon altitude** (`altitudeField`): `"sun's altitude: " + _loc2_.toFixed(1) + "°"`, 1 decimal. (`update` L208.)
- **Observer latitude, earth panel** (`latitudeField2`): `Math.abs(lat).toFixed(1) + "°"` then `" N"` (lat>0) / `" S"` (lat<0); e.g. `10.0° N`. Pairs with a static "observer's latitude:" label. (`changeLatitude` L94-102.)
- **Observer latitude, sunbeam panel** (`latitudeField`): `"observer latitude: " + latitudeField2.text`. (`changeLatitude` L103.)
- The `sun's declination:` and `sun's right ascension:` prefix words are static stage text; the code fields hold only the value.

### Physics & sign conventions

**Obliquity ε = 23.4°** (NOT 23.5). Appears as tropic circles `dec:23.4 / dec:-23.4`, arctic/antarctic `dec:66.6 / dec:-66.6`, and — crucially — as the sphere **`latitude = 66.6`** given to the orbit-view celestial-sphere engine (`init()` L552, L571; earth close-up L489). Because 90 − 66.6 = 23.4, the engine's celestial(=ecliptic) frame is tilted 23.4° from its horizon(=equatorial) frame. Tropic/arctic label circles: `init()` L493-497, L574-578.

**Orbital angle / ecliptic longitude** (`update` L118):
```
var _loc1_ = 270 + daysSinceVE * 360 / 365;   // orbital angle, degrees
```
`daysSinceVE` = days since the vernal equinox; construction value `daysSinceVE = 286` (L673), and `changeDayOfYear(arg){ daysSinceVE = arg + 286; }` (L72). Day-of-year 0 ↔ daysSinceVE 286 ↔ "1 January"; the vernal equinox (daysSinceVE 0) is day-of-year 79 = **"21 March"**. Ecliptic longitude from VE is λ = daysSinceVE·360/365; `_loc1_ = 270 + λ`.

**Sun declination formula.** The readout δ = `alt` from `pointToHorizon({dec:0, ra:12 + _loc1_/15})` (`update` L129, L148, L183; geometry in `3 CS Geometry.as` `pointToHorizon`/`CtoW` + `doM`). Working the engine matrices with sphere latitude 66.6° and siderealTime 12h reduces exactly to the standard relation:
```
sin(δ) = cos(66.6°) · cos(_loc1_) = sin(23.4°) · sin(λ)
```
i.e. **δ = arcsin( sin ε · sin λ ), ε = 23.4°, λ = daysSinceVE·360/365 measured from the vernal equinox.** (Matches poster δ≈−19.7° in late January.) RA similarly derives from `az`; the readout is `((-6 - az/15) mod 24)` capped 23.94h.

**Noon / observer sun altitude** (`update` L184-208):
```
var _loc2_ = 90 - observerLatitude + _loc3_.alt;   // _loc3_.alt = δ
if(_loc2_ > 90){ _loc2_ = 180 - _loc2_; sunDirection = "N"; } else sunDirection = "S";
altitudeField.text = "sun's altitude: " + _loc2_.toFixed(1) + "°";
```
So altitude = 90 − latitude + δ, reflected through 90° when it would exceed 90° (sun then to the north). Sign convention: positive latitude = North.

**June-solstice geometry (axis toward Sun / northern summer).** June solstice = maximum northern declination, λ = 90° ⇒ sin δ = sin 23.4° ⇒ **δ = +23.4°**; this occurs at daysSinceVE ≈ 91.25, i.e. day-of-year ≈ 170 ("20–21 June"), where `_loc1_ ≈ 360`. The subsolar point is placed by:
```
orbitViewMC.globeSphere.setPosition({alt:0, az:180 - _loc1_});                       // Earth on orbit
orbitViewMC.globeSphere.instance.subSolarPoint.setPosition({alt:0, az:360 - _loc1_}); // sub-solar direction
orbitViewMC.globeSphere.instance.globe.instance.setSunDirection({alt:0, az:360 - _loc1_});
```
(`update` L121-126.) With δ = +23.4° the sub-solar point sits on the **Tropic of Cancer (+23.4° latitude)** and the North Pole is in continuous daylight — i.e. **the northern hemisphere / north end of the fixed tilt axis is tilted toward the Sun** at the June solstice. The globe's axis is a fixed screen direction (north-pole axis red `0xFF0000`, south-pole axis blue `0x0000FF`, `GlobeComponent` L9-10); seasons arise because the axis direction is constant while Earth revolves. `setThetaAndPhi(_loc1_, 0)` (L217) / `_loc1_ - 90` (L227) counter-rotate the close-up so the tilt stays fixed in space. Day/night terminator drawn by `GlobeComponent.updateShading` (translucent black, alpha 40) from `setSunDirection`.

**Animation pace** (`onEnterFrameFunc` L46-54, `animateRate = 0.005` L672):
```
var _loc1_ = getTimer();                             // wall-clock ms
daysSinceVE += animateRate * (_loc1_ - timeLast);    // 0.005 days per ms
daySlider.value = ((Math.round(daysSinceVE) - 286) % 365 + 365) % 365;
```
`animateRate` = 0.005 days/ms = **5 simulated days per real second** (a full 365-day year ≈ 73 s). It is wall-clock based (`getTimer`), so the pace is independent of the SWF frame rate; the day always advances forward (Jan→Feb→…). No user speed control.

**Latitude selector geometry:** stickfigure placed at `(radius·cosθ, −radius·sinθ)` with `radius=75`, rotated to stand normal to the circle (`Latitude Selector.as`; clamp ±90 in `Latitude Selector Stickfigure.as` L35-44).

**Other component defaults:**
- Sunbeam Component (spread grid): `gridWidth 365, gridHeight 220, beamDiameter 40, sunAzimuth 0, sunAltitude 45` (PlaceObject init); light-spot opacity ∝ √(sin altitude), "pall" darkening ∝ ((10−alt)/10)³ (`Sunbeam Component.as`).
- Side View Sunbeam Component (angle view, the default): `width 365, height 220, horizonHeight 50, beamSpacing 30, pallIntensity 40`; parallel rays drawn at (90+altitude)° from horizontal, direction flips left/right by `sunDirection` "N"/"S" (`Side View Sunbeam Component.as`).
- Earth close-up (`earthViewMC`): `size 150`, globe scale 187.5, latitude circle red `0xFF0000` (draggable, `init` L505-546); fills switch `"GlobeComponentWater"` (view-from-sun) vs `"Side View"` (view-from-side), `setEarthViewType` L461/475.
- Orbit-view globe fills `"Land Simple"/"Water Simple"`, sphere size 52, scale 100·52/80 (`init` L580-582).
- Initial `observerLatitude = 0` (L711), overridden to 10 by `onReset`.

### Source files cited
- `NAAP/decompiled/eclipticSimulator025/scripts/DefineSprite_292_Symbol 1/frame_1/DoAction.as` — `onReset` (L1-24), `onEnterFrameFunc`/`toggleAnimation` (L46-68, `animateRate` L672), `changeDayOfYear` (L69-74), `changeShowSubsolarPoint` (L75-90), `changeLatitude` (L91-110), `update` (L111-241) incl. sun δ/RA/altitude and June-solstice positions, `changeShowOrbitViewLabels`/`changeShowEarthViewLabels` (L322-400), `changeCenteredObject` (L401-453), `setEarthViewType` (L454-484), `init` (L485-660, obliquity via latitude 66.6, tropic/arctic circles, labels), `getDayString`/`monthPoints`/`monthLabels` (L661-717).
- `NAAP/decompiled/eclipticSimulator025/scripts/frame_1/DoAction.as` — top-level `onReset` → `simulatorMC.onReset()`.
- `NAAP/decompiled/eclipticSimulator025/scripts/frame_1/PlaceObject2_227_Title Bar_129/CLIPACTIONRECORD on(initialize).as` — `resetHandlerFunc="onReset"`.
- Control init records under `DefineSprite_292_Symbol 1/frame_1/`:
  - `PlaceObject2_256_Modified Year Slider_44/CLIPACTIONRECORD on(initialize).as` — slider min 0 / max 364 / value 0 / precision 0.
  - `PlaceObject2_234_Latitude Selector_102/…` — `initLat=45`, `radius=75`, `changeLatitude`.
  - `PlaceObject2_239_Sunbeam Component_69/…` — grid 365×220, sunAltitude 45.
  - `PlaceObject2_255_FPushButtonSymbol_48/…` — "start animation" / `toggleAnimation`.
  - `PlaceObject2_252_FCheckBoxSymbol_119/…` — " labels" (orbit) initialValue false.
  - `PlaceObject2_252_FCheckBoxSymbol_92/…` — " labels" (earth) initialValue false.
  - `PlaceObject2_252_FCheckBoxSymbol_54/…` — " show subsolar point" initialValue true.
  - `PlaceObject2_259_FRadioButtonSymbol_3/…` — " sunbeam spread" (spread) false.
  - `PlaceObject2_259_FRadioButtonSymbol_9/…` — " sunlight angle" (angle) true.
  - `PlaceObject2_259_FRadioButtonSymbol_15/…` — " view from sun" (sun) false.
  - `PlaceObject2_259_FRadioButtonSymbol_21/…` — " view from side" (side) true.
  - `PlaceObject2_259_FRadioButtonSymbol_27/…` — " orbit view" (sun) true.
  - `PlaceObject2_259_FRadioButtonSymbol_33/…` — " celestial sphere" (earth) false.
- `%3Cdefault package%3E/Modified Year Slider.as` — slider class, month ticks `[0,31,…,365]`, labels Jan…Dec.
- `%3Cdefault package%3E/Latitude Selector.as`, `Latitude Selector Stickfigure.as` — latitude drag geometry, ±90 clamp.
- `%3Cdefault package%3E/Sunbeam Component.as`, `Side View Sunbeam Component.as`, `Ray Component.as` — sunbeam/angle panels.
- `%3Cdefault package%3E/Sun Icon.as` — draggable Sun (celestial-sphere mode) → `changeDayOfYear`.
- `%3Cdefault package%3E/CelestialSphere.as`, `2 CS Getter Setter.as`, `3 CS Geometry.as` — projection engine (`setLatitude` as obliquity, `pointToHorizon`, `CtoW`, `doM`/`doA`/`doB`).
- `%3Cdefault package%3E/GlobeComponent.as` — Earth globe, `setSunDirection`/`updateShading` (terminator), axis lines (N red / S blue), fills.
- `%3Cdefault package%3E/CS Label.as` — celestial-sphere text-label class.
- Posters: `NAAP/naap-air-app/files/motion1/animations/seasons_ecliptic.jpg` and `seasons_ecliptic_300.jpg`.

---

## Behavioral notes from the student guide & lab pages

Sources read: `naap_motion1_sg.pdf` (8-page student guide, extracted via mutool stext), plus
`motion1.html`, `tc_units.html`, `tc_finding.html`, `tc_both.html`, `cec_units.html`,
`cec_both.html`, `orbits_light.html`. The five per-animation pages
(`animations/{seasons_ecliptic,tc_flat,tc_globe,cec_flat,cec_sky}.html`) are **just bare SWF
embeds with no teaching text** — nothing usable beyond confirming panel pixel sizes
(tc_flat 850×580, tc_globe 650×400, cec_flat 850×580, cec_sky 850×560, seasons_ecliptic 970×710).

### mapExplorer / tc_flat (Flat Map Explorer)
- **Cursor readout**: prints longitude + latitude of the "active map location"; drag/move the cursor to sample a location (student guide p.1).
- **Central meridian is adjustable**: the map can be re-centered on a different longitude. Coarse control via **"shift map" arrows at the top**; fine control via a **shift-click** feature of the cursor (p.1).
- **Check boxes**: "show cities" and "show map features" overlay extra info (p.1). A **decimal ↔ sexagesimal** toggle is present (guide calls it out later as one of the "same set of features … that were available on the previous maps", p.3).
- **"open Google Maps" button**: centers cursor on present location, launches external Google Maps at that location (needs internet) (p.1).
- **Units / sign convention**: longitude as degrees **E/W**, latitude as degrees **N/S** — Q1 example answers are written `157.5º W`, `21.2º N`, `51.8º N`, `82.1º W` (p.1). Longitude 0–180 E and 0–180 W from Prime Meridian; latitude 0° at equator to +90 N / −90 S; angles measured from Earth's center (`tc_units.html`).
- **Named parallels** to seed labels/snapping (`tc_units.html`): Arctic Circle 66°33′N, Tropic of Cancer 23°27′N, Equator 0°, Tropic of Capricorn 23°27′S, Antarctic Circle 66°33′S.
- **Example test locations (Q1, great fixture values)**: center of Madagascar; the point 157.5°W/21.2°N; Prime Meridian; the point 51.8°N; the point 82.1°W; Tropic of Cancer; São Paulo, Brazil; International Date Line; Arctic Circle; the 90°W meridian; the 30°N parallel (p.1).
- **Q3 conversion fixture**: White House = 77.0365°W, 38.897°N (decimal) → convert to sexagesimal (p.2). `tc_units.html` gives the worked identity `1° = 60′ = 3600″` and example 43°2′27″N/77°14′30.60″W = 43.040833°N/77.241833°W.
- **Projection behavior (Q4/Q5)**: on the flat (Mercator) map the **north pole is a line** (the whole top edge); area is badly distorted — Greenland (2.2M km²) looks comparable to Australia (7.7M km²) though it is far smaller (p.2–3).

### longLatDemo / tc_globe (Globe Explorer)
- **Same feature set as the flat map** — cursor readout, shift-map, show-cities/show-features check boxes, decimal/sexagesimal toggle — "very similar to those in the flat map explorer" (p.2). The "Terrestrial Coordinate Explorers" link opens flat + globe **side by side** for direct comparison (p.2).
- **Globe is a rotatable 3-D sphere** (orthographic-style); on it the **north pole is a single point**, contrasting with the flat map's line (Q4, p.2).
- **Preserves true relative area**: Greenland vs Australia appears in correct proportion, unlike the flat map (Q5, p.3). Same lon E/W, lat N/S readout convention.

### simpleFlatSkyMap / cec_flat (Flat Sky Map Explorer)
- **Same controls as the terrestrial maps** — cursor movement, shift/scroll the map, decimal/sexagesimal toggle, and a set of check boxes to understand (p.3).
- **Readouts**: **Right Ascension (RA)** and **Declination (DEC)** instead of lon/lat. RA in **sidereal hours 0h–24h**, measured **east** from the Vernal Equinox Point (east = increasing RA); DEC 0° at celestial equator to +90° at NCP / −90° at SCP, **no N/S letters**; `1 hour RA = 15°` (`cec_units.html`).
- **East direction (Q8)**: student must identify which way is east on the flat sky map and relate it to RA (RA increases toward the east) (p.4).
- **Star fixtures**: Q6 locate **Polaris** and read its coordinates (≈ +90° dec, near NCP). Q7 measure **Betelgeuse** and **Rigel** in Orion — "Orion is located on the celestial equator" so its stars sit near DEC 0° (p.3).
- **Ecliptic on the flat map (Q10)**: student describes it as a **sine-like curve**, average declination ≈ 0°, ranging **±23.5°** (p.4).
- **Ecliptic date/coordinate fixtures (Q9)**: Vernal Equinox ≈ March 21, Summer Solstice ≈ June 21, Autumnal Equinox ≈ Sept 21 (the extracted table also shows Dec 21 for the Winter Solstice row); student fills in RA/DEC for each (p.4).

### skyMap / cec_sky (Sky Map Explorer)
- The guide treats the two CEC explorers interchangeably — "Open **either** the Flat Sky Map Explorer **or** the Sky Map Explorer" — and lists the **same feature set** (cursor, shift map, decimal/sexagesimal, check boxes) (p.3). All Q6–Q10 fixtures above apply to this explorer too.
- This is the **3-D celestial-sphere** analogue of the flat sky map (relationship mirrors globe↔flat map): same RA/DEC readout, drag to reorient the sphere. Per-animation HTML has no extra prose. (The RotatingSky sibling's SkyProjection view is the closest existing code, per CLAUDE.md.)

### eclipticSimulator / seasons_ecliptic (Seasons and Ecliptic Simulator)
Richest section (guide p.4–8). **Three panels (left, upper-right, lower-right), each with two selectable views = six views total.** Shared controls run along the bottom.
- **Advancing time** — three equivalent methods: the **start/stop animate button**, dragging the **yearly time slider**, or **dragging the sun or the earth in the left panel** (p.4).
- **Rotation is intentionally NOT animated** (rotation vs revolution timescales too different); the stick-figure observer is nonetheless "on a planet rotating with a 24 h period … 12 hours later it will be on the other side of the earth" (p.4, p.6).
- **Left panel – Orbit View**: click-drag to rotate the 3-D perspective (e.g. look straight down onto the orbital plane). A **labels** check box shows where the sun's direct rays hit at different latitudes over the year. Summer solstice → observer sees sun **above** the celestial equator; winter solstice → **below** it (p.5).
- **Left panel – Celestial Sphere**: Earth at center; shows celestial equator + ecliptic + sun. **Sun is draggable and reads out RA/DEC coordinates** (p.5).
- **Upper-right – View from Sun**: Earth as seen from the sun; best view of the **subsolar point** (where direct rays hit). The **noon observer is a red parallel of latitude, draggable to any latitude**, and this drag drives the lower-right panel. The red parallel can land at an "inaccessible" location. Example setup: **observer at 80°N on the summer solstice** (p.5). Tip: dragging the Earth changes **date + location**, not perspective.
- **Upper-right – View from Side**: Earth viewed from within the ecliptic plane along a tangent to the orbit; clearly shows **daylight vs shadow** regions. **Drag the stick figure to change latitude**; dropping it on the subsolar point puts the observer at the most-direct-ray latitude. Example: **winter solstice, observer at 80°N — parallel lies entirely in shadow, so the observer never sees the sun that day** (p.6). Tip: after selecting the stick figure, move the mouse farther away for finer control.
- **Lower-right – Sunbeam Spread**: a "cylinder" of sunlight projected onto a **grid** showing the area the beam covers; larger spread ⇒ lower intensity (p.6).
- **Lower-right – Sunlight Angle**: shows the angle sunbeams strike the Earth and **lists the noon sun's altitude (angle above the horizon)**. Verify: observer at most-direct-ray latitude ⇒ sun overhead at **90°**; observer at least-direct-ray latitude ⇒ sun **on the horizon (0°)** (p.6).
- **Q11 data table (excellent regression fixtures)** — dates Feb 5, Mar 21, May 5, Jun 21, Aug 5, Sep 21, Nov 5, Dec 21, each giving sun **RA, DEC, latitude of most-direct ray, latitude of least-direct ray**. The one **worked example row**: **May 5 → RA 2.9 h, DEC +16.5°, most-direct latitude 16.5° N, least-direct latitude 73.5° S** (p.7). (Note 16.5 = |dec|; 73.5 = 90 − 16.5, opposite hemisphere.)
- **Q15 latitude fixtures**: 0°, 23.5°N, 41°N, 66.5°N, 90°N. Worked example for the **equator (0°)**: noon sun altitude = **90° at vernal equinox, 66.5° at summer solstice, 90° at autumnal equinox, 66.5° at winter solstice** (p.8).

### Physics statements from the prose
- **Obliquity = 23.5°** stated explicitly: "Earth's obliquity is 23.5°" (`orbits_light.html`). The seasons student guide uses **23.5°** and **66.5°** throughout (latitudes 23.5°N & 66.5°N in Q15; DEC +16.5° example; equator solstice altitude 66.5°). ⚠️ Slight inconsistency to resolve in the port: `tc_units.html` lists the **Tropic of Cancer/Capricorn at 23°27′ (≈23.45°)** and **Arctic/Antarctic Circle at 66°33′ (≈66.55°)**, while the seasons prose rounds to 23.5°/66.5°. (CLAUDE.md flags "23.4° vs 23.5°" — the docs say **23.5°**.)
- **Sun's declination range = ±23.5°**, ecliptic average declination 0° (Q10, p.4). Ecliptic traces a sinusoid on the flat sky map.
- **Most-direct-ray latitude = sun's declination** (as a latitude); **least-direct-ray latitude = 90° − |declination|, in the opposite hemisphere** (derived from the May 5 example: dec +16.5° → most 16.5°N, least 73.5°S) (Q11/Q12, p.7).
- **Noon-altitude relationship**: at a latitude equal to the sun's declination the noon sun is at the zenith (90° altitude); it drops to 0° (on the horizon) at the least-direct latitude (p.6). At the equator, noon altitude = 90° at equinoxes and 90° − 23.5° = 66.5° at solstices (p.8).
- **Angle of incidence / beam spreading** (`orbits_light.html`): "the angle the light rays from the sun make with the surface of the earth is called the *angle of incidence*." Large angle of incidence ⇒ beam spread over large area ⇒ intensity weakened; light straight down ("most direct rays") ⇒ full intensity. Magnifying-glass analogy, but seasons *spread* light rather than focus it.
- **Latitude from a star** (`tc_finding.html`): the angle the North Star makes with the horizon (α) equals the observer's latitude.
- **Longitude from time** (`tc_finding.html`): one day = 24 h, so **1 hour = 15° of longitude (360°/24)**. Example: sun highest at 4:00 by a Greenwich-set watch ⇒ 60°W. "Noon" = when the sun is highest (not 12:00 PM); with time zones it falls ~11:30 AM–12:30 PM local. Lincoln, NE (96.7°W, Central) ⇒ astronomical noon ≈ 12:27 PM.
- **Right Ascension** (`cec_units.html`): measured in **sidereal hours 0h–24h, eastward from the Vernal Equinox Point**; **1 hour RA = 15°**; the "0 hour circle" passes through the vernal equinox.
- **Declination** (`cec_units.html`): measured from the celestial equator, **0° → +90° (NCP), 0° → −90° (SCP)**, no N/S letters; closely analogous to latitude.
- **Celestial-sphere motion** (`cec_units.html`): sphere is fixed; Earth rotates west→east (CCW seen from above the N pole), so a ground observer sees the sphere rotate east→west (CW looking up).
- **Sexagesimal identity** (`tc_units.html`): `1° = 60′ = 3600″`; degrees + minutes/60 + seconds/3600 → decimal degrees.
- **Sign / hemisphere conventions**: latitude +N/−S, longitude E/W (0–180 each side of the Prime Meridian); declination +N/−S with no letters; RA increases toward the east.
