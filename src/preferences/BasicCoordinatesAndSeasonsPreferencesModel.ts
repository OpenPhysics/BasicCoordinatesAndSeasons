/**
 * BasicCoordinatesAndSeasonsPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Each preference Property takes its initial value from the
 * corresponding query parameter in basicCoordinatesAndSeasonsQueryParameters.
 */

import { StringUnionProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import {
  DEFAULT_EARTH_MAP_RESOLUTION,
  EARTH_MAP_RESOLUTION_VALUES,
  type EarthMapResolution,
} from "../BasicCoordinatesAndSeasonsConstants.js";
import BasicCoordinatesAndSeasonsNamespace from "../BasicCoordinatesAndSeasonsNamespace.js";
import basicCoordinatesAndSeasonsQueryParameters from "./basicCoordinatesAndSeasonsQueryParameters.js";

/**
 * Narrows the raw query-parameter string to an {@link EarthMapResolution}. The
 * QueryStringMachine schema already constrains the value at runtime via
 * `validValues`; this guard carries that guarantee into the type system without
 * a cast (so an out-of-schema value falls back to the default instead of lying
 * to the compiler).
 */
const isEarthMapResolution = (value: string): value is EarthMapResolution =>
  EARTH_MAP_RESOLUTION_VALUES.some((candidate) => candidate === value);

export class BasicCoordinatesAndSeasonsPreferencesModel {
  /** Flat map / globe shoreline detail; initial value from the `earthMapResolution` query parameter. */
  public readonly earthMapResolutionProperty: StringUnionProperty<EarthMapResolution>;

  public constructor(tandem?: Tandem) {
    const rawResolution = basicCoordinatesAndSeasonsQueryParameters.earthMapResolution;
    const initialValue: EarthMapResolution =
      rawResolution !== null && isEarthMapResolution(rawResolution) ? rawResolution : DEFAULT_EARTH_MAP_RESOLUTION;
    this.earthMapResolutionProperty = new StringUnionProperty(initialValue, {
      validValues: EARTH_MAP_RESOLUTION_VALUES,
      ...(tandem && { tandem: tandem.createTandem("earthMapResolutionProperty") }),
    });
  }

  public reset(): void {
    this.earthMapResolutionProperty.reset();
  }
}

BasicCoordinatesAndSeasonsNamespace.register(
  "BasicCoordinatesAndSeasonsPreferencesModel",
  BasicCoordinatesAndSeasonsPreferencesModel,
);
