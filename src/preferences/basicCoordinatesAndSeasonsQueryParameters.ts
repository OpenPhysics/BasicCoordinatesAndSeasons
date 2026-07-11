/**
 * basicCoordinatesAndSeasonsQueryParameters.ts
 *
 * Sim-specific startup query parameters. This is the single place where every
 * sim-specific query parameter is declared and documented. Public-facing
 * parameters (intended for end users / sharing links) must set `public: true`.
 *
 * ── How to add a query parameter ──────────────────────────────────────────────
 * 1. Add an entry below with a `type`, `defaultValue`, and (if user-facing)
 *    `public: true`. Add `isValidValue` to bound numeric ranges.
 * 2. If it should also be user-editable at runtime, surface it as a preference
 *    in BasicCoordinatesAndSeasonsPreferencesModel (initialize that Property from this query parameter).
 *
 * Usage: append e.g. `?earthMapResolution=low` to the sim URL.
 */

import { logGlobal } from "scenerystack/phet-core";
import { QueryStringMachine } from "scenerystack/query-string-machine";
import { DEFAULT_EARTH_MAP_RESOLUTION, EARTH_MAP_RESOLUTION_VALUES } from "../BasicCoordinatesAndSeasonsConstants.js";
import BasicCoordinatesAndSeasonsNamespace from "../BasicCoordinatesAndSeasonsNamespace.js";

const basicCoordinatesAndSeasonsQueryParameters = QueryStringMachine.getAll({
  /**
   * Shoreline detail of the Terrestrial screen's flat map and globe. `low` uses
   * the original NAAP outline; `high` uses Natural Earth land polygons.
   * Example: `?earthMapResolution=low`.
   */
  earthMapResolution: {
    type: "string",
    defaultValue: DEFAULT_EARTH_MAP_RESOLUTION,
    validValues: EARTH_MAP_RESOLUTION_VALUES,
    public: true,
  },
});

BasicCoordinatesAndSeasonsNamespace.register(
  "basicCoordinatesAndSeasonsQueryParameters",
  basicCoordinatesAndSeasonsQueryParameters,
);

// Log query parameters (for the console / PhET-iO).
logGlobal("phet.chipper.queryParameters");

export default basicCoordinatesAndSeasonsQueryParameters;
