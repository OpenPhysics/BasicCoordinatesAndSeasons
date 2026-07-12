/**
 * CelestialModel.ts
 *
 * State for the Celestial Coordinates screen: one point on the sky (right
 * ascension, declination) shared by the flat sky map and the celestial sphere,
 * plus visibility toggles for grid overlays, the ecliptic, galactic equator,
 * equinox/solstice markers, and constellation stick figures. Also tracks the
 * coordinate readout format (decimal vs sexagesimal) and the flat map's
 * horizontal RA offset. Static — `step` is a no-op.
 */

import { BooleanProperty, NumberProperty, Property } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import type { CoordinateFormat } from "../../BasicCoordinatesAndSeasonsConstants.js";

/** Default star position (compromise between the two NAAP celestial explorers). */
export const DEFAULT_STAR_RA_HOURS = 8;
export const DEFAULT_STAR_DEC_DEGREES = 30;

export const STAR_RA_RANGE = new Range(0, 24);
export const STAR_DEC_RANGE = new Range(-90, 90);

/** Default flat-map RA offset (hours) — matches NAAP simpleFlatSkyMap initial offset. */
export const DEFAULT_RA_OFFSET_HOURS = 16.5;

export class CelestialModel implements TModel {
  /** Right ascension of the point, in hours [0, 24). (No SI unit token for hours.) */
  public readonly starRaProperty = new NumberProperty(DEFAULT_STAR_RA_HOURS, { range: STAR_RA_RANGE });

  /** Declination of the point, in degrees [−90, 90]. */
  public readonly starDecProperty = new NumberProperty(DEFAULT_STAR_DEC_DEGREES, { range: STAR_DEC_RANGE, units: "°" });

  /** Whether the zodiac constellation stick figures are shown. */
  public readonly constellationsVisibleProperty = new BooleanProperty(false);

  /** Whether the RA/Dec graticule is shown. */
  public readonly gridVisibleProperty = new BooleanProperty(true);

  /** Whether the celestial equator is shown. */
  public readonly celestialEquatorVisibleProperty = new BooleanProperty(true);

  /** Whether the ecliptic is shown. */
  public readonly eclipticVisibleProperty = new BooleanProperty(false);

  /** Whether the galactic equator is shown. */
  public readonly galacticEquatorVisibleProperty = new BooleanProperty(false);

  /** Whether equinox and solstice markers are shown. */
  public readonly equinoxesAndSolsticesVisibleProperty = new BooleanProperty(false);

  /** Whether the celestial-pole labels (NCP/SCP) are shown on the sphere. */
  public readonly celestialPolesVisibleProperty = new BooleanProperty(false);

  /** Coordinate readout format: "decimal" or "sexagesimal". */
  public readonly coordinateFormatProperty = new Property<CoordinateFormat>("decimal");

  /**
   * Horizontal RA offset (hours) for the flat sky map — controls panning. Left
   * unbounded (like the terrestrial map's center-longitude) so the pan buttons
   * scroll continuously; FlatSkyMapNode wraps it modulo 24ʰ for seamless tiling.
   */
  public readonly raOffsetProperty = new NumberProperty(DEFAULT_RA_OFFSET_HOURS);

  public reset(): void {
    this.starRaProperty.reset();
    this.starDecProperty.reset();
    this.constellationsVisibleProperty.reset();
    this.gridVisibleProperty.reset();
    this.celestialEquatorVisibleProperty.reset();
    this.eclipticVisibleProperty.reset();
    this.galacticEquatorVisibleProperty.reset();
    this.equinoxesAndSolsticesVisibleProperty.reset();
    this.celestialPolesVisibleProperty.reset();
    this.coordinateFormatProperty.reset();
    this.raOffsetProperty.reset();
  }

  public step(_dt: number): void {
    // Static screen — nothing to advance.
  }
}
