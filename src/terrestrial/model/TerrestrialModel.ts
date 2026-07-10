/**
 * TerrestrialModel.ts
 *
 * State for the Terrestrial Coordinates screen: a single observer location
 * (latitude, longitude) shared by the flat map and the globe, plus a toggle for
 * the reference circles (equator already drawn; tropics ±23.4° and polar circles
 * ±66.6°). Location has no dynamics — `step` is a no-op.
 */

import { BooleanProperty, NumberProperty } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import {
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

  /** Whether the tropic (±23.4°) and polar (±66.6°) reference circles are shown. */
  public readonly referenceCirclesVisibleProperty = new BooleanProperty(false);

  public reset(): void {
    this.latitudeProperty.reset();
    this.longitudeProperty.reset();
    this.referenceCirclesVisibleProperty.reset();
  }

  public step(_dt: number): void {
    // Static screen — nothing to advance.
  }
}
