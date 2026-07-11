/**
 * formatAngles.ts
 *
 * Small pure helpers for the hemisphere-letter coordinate readouts used across
 * the sim (matching NAAP: a positive magnitude followed by a compass letter,
 * never a signed value). The compass letters are parameterized so callers can
 * pass localized strings; they default to English N/S/E/W for the unit tests.
 */

import { toFixed } from "scenerystack/dot";

export type HemisphereLetters = {
  north: string;
  south: string;
  east: string;
  west: string;
};

export const DEFAULT_HEMISPHERE_LETTERS: HemisphereLetters = { north: "N", south: "S", east: "E", west: "W" };

/** Formats a latitude as e.g. `40.8° N` / `33.9° S`. */
export function formatLatitude(
  latitudeDeg: number,
  decimalPlaces = 1,
  letters: HemisphereLetters = DEFAULT_HEMISPHERE_LETTERS,
): string {
  const letter = latitudeDeg >= 0 ? letters.north : letters.south;
  return `${toFixed(Math.abs(latitudeDeg), decimalPlaces)}° ${letter}`;
}

/** Formats a longitude (+E) as e.g. `151.2° E` / `96.7° W`. */
export function formatLongitude(
  longitudeDeg: number,
  decimalPlaces = 1,
  letters: HemisphereLetters = DEFAULT_HEMISPHERE_LETTERS,
): string {
  const letter = longitudeDeg >= 0 ? letters.east : letters.west;
  return `${toFixed(Math.abs(longitudeDeg), decimalPlaces)}° ${letter}`;
}

/**
 * Formats a signed angle magnitude as degrees + zero-padded arc-minutes, e.g.
 * `40° 48′`. Matches the NAAP mapExplorer `getStrings`: minutes are floored and
 * seconds dropped. Rounds to the nearest arc-second first to avoid float noise
 * (e.g. 40.8 → 48′, never 47′).
 */
function formatDegreesMinutes(angleDeg: number): string {
  const totalSeconds = Math.round(Math.abs(angleDeg) * 3600);
  const degrees = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${degrees}° ${paddedMinutes}′`;
}

/** Formats a latitude in sexagesimal form, e.g. `40° 48′ N` / `33° 55′ S`. */
export function formatLatitudeDMS(
  latitudeDeg: number,
  letters: HemisphereLetters = DEFAULT_HEMISPHERE_LETTERS,
): string {
  const letter = latitudeDeg >= 0 ? letters.north : letters.south;
  return `${formatDegreesMinutes(latitudeDeg)} ${letter}`;
}

/** Formats a longitude (+E) in sexagesimal form, e.g. `116° 23′ E` / `96° 40′ W`. */
export function formatLongitudeDMS(
  longitudeDeg: number,
  letters: HemisphereLetters = DEFAULT_HEMISPHERE_LETTERS,
): string {
  const letter = longitudeDeg >= 0 ? letters.east : letters.west;
  return `${formatDegreesMinutes(longitudeDeg)} ${letter}`;
}
