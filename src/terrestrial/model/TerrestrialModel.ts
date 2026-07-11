/**
 * TerrestrialModel.ts
 *
 * State for the Terrestrial Coordinates screen: a single observer location
 * (latitude, longitude) shared by the flat map and the globe, plus flat-map view
 * state — the horizontal pan offset, city/feature overlays, and the coordinate
 * display format. Location has no dynamics — `step` is a no-op.
 */

import { BooleanProperty, NumberProperty, StringUnionProperty } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import {
  COORDINATE_FORMAT_VALUES,
  type CoordinateFormat,
  DEFAULT_LATITUDE,
  DEFAULT_LONGITUDE,
  LATITUDE_RANGE,
  LONGITUDE_RANGE,
} from "../../BasicCoordinatesAndSeasonsConstants.js";

export class TerrestrialModel implements TModel {
  /** Observer latitude in degrees (+N). */
  public readonly latitudeProperty = new NumberProperty(DEFAULT_LATITUDE, { range: LATITUDE_RANGE, units: "°" });

  /** Observer longitude in degrees (+E). */
  public readonly longitudeProperty = new NumberProperty(DEFAULT_LONGITUDE, { range: LONGITUDE_RANGE, units: "°" });

  /**
   * Longitude (°, +E) at the flat map's horizontal center. Unbounded on purpose:
   * panning adds/subtracts freely and the map view wraps it mod 360, so animated
   * pans never hit a ±180 seam. Reset returns to 0 (Greenwich centered).
   */
  public readonly mapCenterLongitudeProperty = new NumberProperty(0, { units: "°" });

  /** Whether the reference cities are labeled on the flat map. */
  public readonly showCitiesProperty = new BooleanProperty(false);

  /**
   * Whether the flat-map "features" are shown: the tropic (±23.4°) and polar
   * (±66.6°) reference circles together with the International Date Line.
   */
  public readonly mapFeaturesVisibleProperty = new BooleanProperty(false);

  /** Whether coordinates read out in decimal degrees or sexagesimal (D° M′). */
  public readonly coordinateFormatProperty = new StringUnionProperty<CoordinateFormat>("decimal", {
    validValues: COORDINATE_FORMAT_VALUES,
  });

  public reset(): void {
    this.latitudeProperty.reset();
    this.longitudeProperty.reset();
    this.mapCenterLongitudeProperty.reset();
    this.showCitiesProperty.reset();
    this.mapFeaturesVisibleProperty.reset();
    this.coordinateFormatProperty.reset();
  }

  public step(_dt: number): void {
    // Static screen — nothing to advance.
  }
}
