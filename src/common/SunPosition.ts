/**
 * SunPosition.ts
 *
 * Pure solar-position math for the Seasons screen — the heart of this sim's new
 * physics. A circular orbit (one orbit = one year, no equation of time, no
 * precession/refraction) with a fixed obliquity ε. All angles are in degrees,
 * right ascension in hours; no scenery/model dependencies, so it is trivially
 * unit-testable (see tests/SunPosition.test.ts).
 *
 * Equations (doc/model.md; cross-checked against the decompiled NAAP
 * eclipticSimulator025 and UNL's sun-motion-simulator utils.js):
 *   - sin δ☉ = sin ε · sin λ☉
 *   - α☉ = atan2(sin λ☉ · cos ε, cos λ☉)
 *   - noon altitude h = 90° − |φ − δ☉|
 *   - λ☉ = 360° · (dayOfYear − MARCH_EQUINOX_DAY) / DAYS_PER_YEAR
 */

import { DAYS_PER_YEAR, OBLIQUITY_DEGREES } from "../BasicCoordinatesAndSeasonsConstants.js";
import { degToRad, normalizeDegrees, normalizeHours, radiansToHours, radToDeg } from "./SkyCoordinates.js";

/**
 * Day-of-year (non-leap, 1-based) of the March (vernal) equinox, where the Sun's
 * ecliptic longitude λ☉ = 0. ≈ March 20.
 */
export const MARCH_EQUINOX_DAY = 79.25;

/** Non-leap-year month lengths; sums to 365. */
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const DAYS_PER_CALENDAR_YEAR = 365;

/** sin δ☉ = sin ε · sin λ☉. Returns the Sun's declination in degrees. */
export function sunDeclinationDeg(sunEclipticLongitudeDeg: number, obliquityDeg: number = OBLIQUITY_DEGREES): number {
  const sinDec = Math.sin(degToRad(obliquityDeg)) * Math.sin(degToRad(sunEclipticLongitudeDeg));
  return radToDeg(Math.asin(Math.max(-1, Math.min(1, sinDec))));
}

/**
 * α☉ = atan2(sin λ☉ · cos ε, cos λ☉), normalized to [0, 24) hours. 0 h at the
 * March equinox, 6 h at the June solstice, 12 h at September, 18 h at December.
 */
export function sunRightAscensionHours(
  sunEclipticLongitudeDeg: number,
  obliquityDeg: number = OBLIQUITY_DEGREES,
): number {
  const lambda = degToRad(sunEclipticLongitudeDeg);
  const raRad = Math.atan2(Math.sin(lambda) * Math.cos(degToRad(obliquityDeg)), Math.cos(lambda));
  return normalizeHours(radiansToHours(raRad));
}

/**
 * Noon Sun altitude h = 90° − |φ − δ☉| for an observer at latitude φ. Can be
 * negative (polar night). Matches the magnitude of NAAP's `90 − φ + δ`.
 */
export function noonSunAltitudeDeg(latitudeDeg: number, declinationDeg: number): number {
  return 90 - Math.abs(latitudeDeg - declinationDeg);
}

/**
 * Ecliptic longitude λ☉ (degrees, [0, 360)) for a given day-of-year on the
 * circular-orbit model. λ☉ = 0 at MARCH_EQUINOX_DAY.
 */
export function eclipticLongitudeForDayOfYear(dayOfYear: number): number {
  return normalizeDegrees((360 * (dayOfYear - MARCH_EQUINOX_DAY)) / DAYS_PER_YEAR);
}

/**
 * Inverse of {@link eclipticLongitudeForDayOfYear}: the day-of-year (wrapped into
 * [1, 1 + DAYS_PER_YEAR)) at which the Sun has ecliptic longitude λ☉. The pair is
 * an exact modular inverse, so a day → longitude → day round-trip returns the day.
 */
export function dayOfYearForEclipticLongitude(lambdaDeg: number): number {
  const raw = MARCH_EQUINOX_DAY + (normalizeDegrees(lambdaDeg) * DAYS_PER_YEAR) / 360;
  return ((((raw - 1) % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR) + 1;
}

/**
 * Calendar month/day for a day-of-year, using a fixed non-leap year. The
 * day-of-year is floored and wrapped into [1, 365] first.
 *
 * @returns monthIndex 0 (January) … 11 (December), dayOfMonth 1 … 31.
 */
export function monthAndDayForDayOfYear(dayOfYear: number): { monthIndex: number; dayOfMonth: number } {
  let day =
    ((((Math.floor(dayOfYear) - 1) % DAYS_PER_CALENDAR_YEAR) + DAYS_PER_CALENDAR_YEAR) % DAYS_PER_CALENDAR_YEAR) + 1;
  for (let monthIndex = 0; monthIndex < MONTH_LENGTHS.length; monthIndex++) {
    const length = MONTH_LENGTHS[monthIndex] ?? 31;
    if (day <= length) {
      return { monthIndex, dayOfMonth: day };
    }
    day -= length;
  }
  return { monthIndex: 11, dayOfMonth: 31 };
}
