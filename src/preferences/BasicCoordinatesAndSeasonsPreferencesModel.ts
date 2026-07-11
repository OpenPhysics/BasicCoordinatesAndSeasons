/**
 * BasicCoordinatesAndSeasonsPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Each preference Property takes its initial value from the
 * corresponding query parameter in basicCoordinatesAndSeasonsQueryParameters.
 */

import { StringUnionProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import { EARTH_MAP_RESOLUTION_VALUES, type EarthMapResolution } from "../BasicCoordinatesAndSeasonsConstants.js";
import BasicCoordinatesAndSeasonsNamespace from "../BasicCoordinatesAndSeasonsNamespace.js";
import basicCoordinatesAndSeasonsQueryParameters from "./basicCoordinatesAndSeasonsQueryParameters.js";

export class BasicCoordinatesAndSeasonsPreferencesModel {
  /** Flat map / globe shoreline detail; initial value from the `earthMapResolution` query parameter. */
  public readonly earthMapResolutionProperty: StringUnionProperty<EarthMapResolution>;

  public constructor(tandem?: Tandem) {
    this.earthMapResolutionProperty = new StringUnionProperty(
      basicCoordinatesAndSeasonsQueryParameters.earthMapResolution as EarthMapResolution,
      {
        validValues: EARTH_MAP_RESOLUTION_VALUES,
        ...(tandem && { tandem: tandem.createTandem("earthMapResolutionProperty") }),
      },
    );
  }

  public reset(): void {
    this.earthMapResolutionProperty.reset();
  }
}

BasicCoordinatesAndSeasonsNamespace.register(
  "BasicCoordinatesAndSeasonsPreferencesModel",
  BasicCoordinatesAndSeasonsPreferencesModel,
);
