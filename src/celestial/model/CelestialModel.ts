/**
 * CelestialModel.ts
 *
 * State for the Celestial Coordinates screen: one point on the sky (right
 * ascension, declination) shared by the flat sky map and the celestial sphere,
 * plus visibility toggles for the grid, celestial equator, ecliptic, and the
 * zodiac constellations. Static — `step` is a no-op.
 */

import { BooleanProperty, NumberProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";

/** Default star position (compromise between the two NAAP celestial explorers). */
export const DEFAULT_STAR_RA_HOURS = 8;
export const DEFAULT_STAR_DEC_DEGREES = 30;

export const STAR_RA_RANGE = new Range(0, 24);
export const STAR_DEC_RANGE = new Range(-90, 90);

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

  public reset(): void {
    this.starRaProperty.reset();
    this.starDecProperty.reset();
    this.constellationsVisibleProperty.reset();
    this.gridVisibleProperty.reset();
    this.celestialEquatorVisibleProperty.reset();
    this.eclipticVisibleProperty.reset();
  }

  public step(_dt: number): void {
    // Static screen — nothing to advance.
  }
}
