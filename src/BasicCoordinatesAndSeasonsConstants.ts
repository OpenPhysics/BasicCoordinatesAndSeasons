/**
 * BasicCoordinatesAndSeasonsConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Physics / model values use SI units (metres, seconds, kilograms, …) or the
 *    natural astronomy unit (degrees, hours); note the unit in a comment.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in BasicCoordinatesAndSeasonsColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 */

import { Dimension2, Range } from "scenerystack/dot";
import BasicCoordinatesAndSeasonsNamespace from "./BasicCoordinatesAndSeasonsNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/** Corner radius shared by control panels and dialogs. */
export const PANEL_CORNER_RADIUS = 6;

/** Font size (px) for the compact readout/control labels ported from the sibling motion2 sim. */
export const CONTROL_FONT_SIZE = 12;

/** Gap (px) between a projected sky view and its readout row. */
export const VIEW_READOUT_GAP = 10;

// ── Control chrome (ported from the sibling motion2 sim) ──────────────────────

/** Side length (px) of a checkbox box. */
export const CHECKBOX_BOX_WIDTH = 16;

/** Track size of a standalone slider. */
export const STANDALONE_SLIDER_TRACK_SIZE = new Dimension2(75, 4);

/** Track size of a NumberControl's slider. */
export const NUMBER_CONTROL_SLIDER_TRACK_SIZE = new Dimension2(140, 3);

/** Thumb size shared by sliders. */
export const SLIDER_THUMB_SIZE = new Dimension2(13, 26);

/** Arrow-key nudge step (°) for dragging the observer location on the map/globe. */
export const LOCATION_STEP_DEGREES = 5;

/** Longitude shift (°) applied by each flat-map pan (◀ / ▶) button. Matches NAAP's ±45°. */
export const MAP_PAN_STEP_DEGREES = 45;

/** Duration (s) of the animated flat-map pan, matching NAAP's 400 ms shift. */
export const MAP_PAN_ANIMATION_DURATION = 0.4;

// ── Sky-engine geometry (ported from the sibling motion2 sim) ─────────────────────────────

/** Radius (px) of a full celestial sphere / globe projection. */
export const SPHERE_RADIUS = 170;

/** Convenience: the pixel extent of a sky view drawn at SPHERE_RADIUS. */
export const SKY_VIEW_MAX_SIZE = SPHERE_RADIUS * 2;

/** Radius (px) of a rendered star / point marker. */
export const STAR_RADIUS = 5;

// ── Earth map resolution (preference-driven coastline detail) ─────────────────

export type EarthMapResolution = "low" | "high";
export const EARTH_MAP_RESOLUTION_VALUES = ["low", "high"] as const satisfies readonly EarthMapResolution[];
export const DEFAULT_EARTH_MAP_RESOLUTION: EarthMapResolution = "high";

// ── Coordinate display format (Terrestrial screen) ────────────────────────────

/** Decimal degrees (`40.8° N`) vs sexagesimal degrees-minutes (`40° 48′ N`). */
export type CoordinateFormat = "decimal" | "sexagesimal";
export const COORDINATE_FORMAT_VALUES = ["decimal", "sexagesimal"] as const satisfies readonly CoordinateFormat[];

// ── Observer coordinate ranges & defaults (degrees) ───────────────────────────
// NAAP's default location is Lincoln, NE (40.8° N, 96.7° W), verified against the
// decompiled mapExplorer010/longLatDemo014 `onReset` — see doc/naap-control-inventory.md.

/** Default observer latitude (°, +N). */
export const DEFAULT_LATITUDE = 40.8;

/** Default observer longitude (°, +E so −96.7 = 96.7° W). */
export const DEFAULT_LONGITUDE = -96.7;

/** Latitude range (°). */
export const LATITUDE_RANGE = new Range(-90, 90);

/** Longitude range (°). */
export const LONGITUDE_RANGE = new Range(-180, 180);

// ── Physics (degrees / days) ──────────────────────────────────────────────────
// Values transcribed from the decompiled NAAP animations (ε = 23.4° is what the
// Flash code uses; the printed student guide prose says 23.5° — not adopted).

/** Obliquity of the ecliptic ε (°), fixed. */
export const OBLIQUITY_DEGREES = 23.4;

/** Length of a year in days for the circular-orbit model. */
export const DAYS_PER_YEAR = 365.24;

/**
 * Playback rate for the Seasons animation: simulated days advanced per real
 * second while playing. NAAP's eclipticSimulator uses ~5 days/s (animateRate
 * 0.005 days/ms) — see doc/naap-control-inventory.md.
 */
export const SEASONS_ANIMATION_DAYS_PER_SECOND = 5;

BasicCoordinatesAndSeasonsNamespace.register("BasicCoordinatesAndSeasonsConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  CONTROL_FONT_SIZE,
  VIEW_READOUT_GAP,
  CHECKBOX_BOX_WIDTH,
  STANDALONE_SLIDER_TRACK_SIZE,
  NUMBER_CONTROL_SLIDER_TRACK_SIZE,
  SLIDER_THUMB_SIZE,
  LOCATION_STEP_DEGREES,
  MAP_PAN_STEP_DEGREES,
  MAP_PAN_ANIMATION_DURATION,
  SPHERE_RADIUS,
  SKY_VIEW_MAX_SIZE,
  STAR_RADIUS,
  EARTH_MAP_RESOLUTION_VALUES,
  DEFAULT_EARTH_MAP_RESOLUTION,
  COORDINATE_FORMAT_VALUES,
  DEFAULT_LATITUDE,
  DEFAULT_LONGITUDE,
  LATITUDE_RANGE,
  LONGITUDE_RANGE,
  OBLIQUITY_DEGREES,
  DAYS_PER_YEAR,
  SEASONS_ANIMATION_DAYS_PER_SECOND,
});
