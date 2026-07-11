/**
 * DateLineData.ts
 *
 * The International Date Line drawn over the Terrestrial flat map when "Show map
 * features" is on. Transcribed verbatim from the `IDL` array in the decompiled
 * NAAP mapExplorer010 (`Map.as`) — an open polyline (not a closed polygon) of
 * lat/lon vertices, ordered pole-to-pole.
 *
 * Every vertex lies near the antimeridian (longitudes ≥ 167° or ≤ −151°). When
 * rendered, negative longitudes are unwrapped by +360 so the polyline stays
 * horizontally contiguous across the ±180° seam (see FlatEarthMapNode).
 */

export type GeoVertex = {
  /** Latitude in decimal degrees (+N). */
  readonly latitude: number;
  /** Longitude in decimal degrees (+E). */
  readonly longitude: number;
};

export const DATE_LINE: readonly GeoVertex[] = [
  { latitude: 90, longitude: 180 },
  { latitude: 75, longitude: 180 },
  { latitude: 72, longitude: -169 },
  { latitude: 65.5, longitude: -169 },
  { latitude: 64, longitude: -175 },
  { latitude: 50.5, longitude: 167 },
  { latitude: 48, longitude: 180 },
  { latitude: 2, longitude: 180 },
  { latitude: 0, longitude: -179 },
  { latitude: 0, longitude: -165 },
  { latitude: -3, longitude: -165 },
  { latitude: -3, longitude: -160 },
  { latitude: 2, longitude: -160 },
  { latitude: 2, longitude: -162 },
  { latitude: 5, longitude: -162 },
  { latitude: 5, longitude: -154 },
  { latitude: -8, longitude: -151 },
  { latitude: -12, longitude: -151 },
  { latitude: -12, longitude: -157 },
  { latitude: -9, longitude: -157 },
  { latitude: -9, longitude: -178 },
  { latitude: -15, longitude: -175.5 },
  { latitude: -44.75, longitude: -175.5 },
  { latitude: -51.5, longitude: 180 },
  { latitude: -90, longitude: 180 },
];
