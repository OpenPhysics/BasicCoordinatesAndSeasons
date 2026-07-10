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
