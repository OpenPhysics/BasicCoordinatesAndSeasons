/**
 * CityData.ts
 *
 * The reference cities shown on the Terrestrial flat map when "Show cities" is on.
 * Transcribed from `cityList` in the decompiled NAAP mapExplorer010
 * (`Map.as`), converting each deg/min/hemisphere entry to signed decimal degrees
 * (+N latitude, +E longitude). The original's `side` field is kept to place each
 * label clear of its dot; it defaults to "right".
 *
 * Note: the NAAP data has Lincoln's latitude direction as "W" (a typo); the Flash
 * code only negates on "S", so it renders as 40.82° N / 96.67° W — which is exactly
 * the sim's default observer location. Transcribed here as N to match.
 */

export type CityLabelSide = "left" | "right" | "top" | "bottom";

export type City = {
  /** City display name. */
  readonly name: string;
  /** Latitude in decimal degrees (+N). */
  readonly latitude: number;
  /** Longitude in decimal degrees (+E). */
  readonly longitude: number;
  /** Which side of the dot to place the label (defaults to "right"). */
  readonly side: CityLabelSide;
};

export const CITIES: readonly City[] = [
  { name: "Buenos Aires, Argentina", latitude: -34.3333, longitude: -58.5, side: "left" },
  { name: "Lima, Peru", latitude: -12.1, longitude: -76.9167, side: "left" },
  { name: "Casablanca, Morocco", latitude: 33.5333, longitude: -7.6833, side: "bottom" },
  { name: "Monrovia, Liberia", latitude: 6.3333, longitude: -10.7667, side: "right" },
  { name: "São Paulo, Brazil", latitude: -23.5667, longitude: -46.6333, side: "bottom" },
  { name: "Lincoln", latitude: 40.8167, longitude: -96.6667, side: "left" },
  { name: "Baghdad, Iraq", latitude: 33.2333, longitude: 44.3667, side: "right" },
  { name: "Greenwich, England", latitude: 51.6667, longitude: 0, side: "left" },
  { name: "Singapore", latitude: 1.3667, longitude: 103.75, side: "left" },
  { name: "Havana, Cuba", latitude: 23.1333, longitude: -82.3833, side: "bottom" },
  { name: "Canberra, Australia", latitude: -35.3, longitude: 149.1333, side: "bottom" },
  { name: "Calcutta, India", latitude: 22.5333, longitude: 88.3667, side: "bottom" },
  { name: "Beijing, China", latitude: 39.9167, longitude: 116.3833, side: "right" },
  { name: "Reykjavik, Iceland", latitude: 64.15, longitude: -21.9667, side: "right" },
  { name: "Murmansk, Russia", latitude: 68.9833, longitude: 33.1333, side: "top" },
  { name: "Washington DC", latitude: 38.8833, longitude: -77.0333, side: "right" },
  { name: "Barrow, Alaska", latitude: 71.2833, longitude: -156.7833, side: "right" },
  { name: "Moscow, Russia", latitude: 55.75, longitude: 37.6167, side: "right" },
  { name: "Cape Town, South Africa", latitude: -33.9167, longitude: 18.45, side: "bottom" },
  { name: "McMurdo Station", latitude: -77.85, longitude: 166.6667, side: "left" },
];
