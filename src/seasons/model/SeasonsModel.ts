/**
 * SeasonsModel.ts
 *
 * State for the Seasons screen. The canonical state is the Sun's ecliptic
 * longitude λ☉ (0° = March equinox); day-of-year, declination, right ascension,
 * and noon Sun altitude are all derived from it (and the observer latitude) via
 * SunPosition.ts. A composed TimeModel drives play/pause; while playing, `step`
 * advances λ☉ at SEASONS_ANIMATION_DAYS_PER_SECOND.
 */

import {
  BooleanProperty,
  DerivedProperty,
  NumberProperty,
  StringUnionProperty,
  type TReadOnlyProperty,
} from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import {
  DAYS_PER_YEAR,
  DEFAULT_LATITUDE,
  LATITUDE_RANGE,
  SEASONS_ANIMATION_DAYS_PER_SECOND,
} from "../../BasicCoordinatesAndSeasonsConstants.js";
import {
  dayOfYearForEclipticLongitude,
  eclipticLongitudeForDayOfYear,
  monthAndDayForDayOfYear,
  noonSunAltitudeDeg,
  sunDeclinationDeg,
  sunRightAscensionHours,
} from "../../common/SunPosition.js";
import { TimeModel } from "../../common/TimeModel.js";

export const ECLIPTIC_LONGITUDE_RANGE = new Range(0, 360);

/**
 * Initial Sun position, matching the NAAP "Seasons and Ecliptic Simulator" reset
 * state: day-of-year 41 (February 10). Starting off the equinox keeps the ecliptic
 * visibly separated from the celestial equator on the sphere view (their labels
 * would otherwise coincide) and reproduces the Flash lab's opening frame.
 */
const DEFAULT_SUN_ECLIPTIC_LONGITUDE = eclipticLongitudeForDayOfYear(41);

/** Which visualization fills the large left-hand view panel. */
export const SEASONS_VIEW_MODES = ["orbit", "sphere"] as const;
export type SeasonsViewMode = (typeof SEASONS_VIEW_MODES)[number];

/** How the Earth close-up is framed: side-on, or looking down the Sun–Earth line. */
export const EARTH_VIEW_MODES = ["side", "sun"] as const;
export type EarthViewMode = (typeof EARTH_VIEW_MODES)[number];

/** Which sunbeam panel is shown: the side-on ray angle, or the top-down footprint spread. */
export const SUNBEAM_MODES = ["angle", "spread"] as const;
export type SunbeamMode = (typeof SUNBEAM_MODES)[number];

export class SeasonsModel implements TModel {
  /** Play/pause + elapsed-time clock. */
  public readonly timer = new TimeModel();

  /** Canonical state: the Sun's ecliptic longitude λ☉ (°, 0 = March equinox). */
  public readonly sunEclipticLongitudeProperty = new NumberProperty(DEFAULT_SUN_ECLIPTIC_LONGITUDE, {
    range: ECLIPTIC_LONGITUDE_RANGE,
    units: "°",
  });

  /** Which view fills the large left panel: the orbit ("orbit") or the celestial sphere ("sphere"). */
  public readonly viewModeProperty = new StringUnionProperty<SeasonsViewMode>("orbit", {
    validValues: [...SEASONS_VIEW_MODES],
  });

  /** How the Earth close-up is framed (NAAP default: "side"). */
  public readonly earthViewModeProperty = new StringUnionProperty<EarthViewMode>("side", {
    validValues: [...EARTH_VIEW_MODES],
  });

  /** Which sunbeam panel is shown (NAAP default: "angle"). */
  public readonly sunbeamModeProperty = new StringUnionProperty<SunbeamMode>("angle", {
    validValues: [...SUNBEAM_MODES],
  });

  /** The observer latitude whose noon Sun altitude is shown (°, +N). */
  public readonly latitudeProperty = new NumberProperty(DEFAULT_LATITUDE, { range: LATITUDE_RANGE, units: "°" });

  /** Whether the subsolar-point marker is shown (NAAP default: on). */
  public readonly subsolarPointVisibleProperty = new BooleanProperty(true);

  /**
   * Whether the celestial-sphere text labels are shown (north/south celestial pole,
   * celestial equator, ecliptic, and the "to VE / AE / SS / WS" direction arrows).
   * NAAP's single "labels" checkbox; off by default, matching the Flash reset state.
   */
  public readonly sphereLabelsVisibleProperty = new BooleanProperty(false);

  /**
   * Whether the Earth close-up's reference-circle labels (equator, tropics, polar
   * circles, poles) are shown. NAAP's per-view "labels" checkbox; off by default.
   */
  public readonly earthLabelsVisibleProperty = new BooleanProperty(false);

  // ── Derived quantities (all from λ☉ and latitude) ──────────────────────────
  /** Sun declination δ☉ (°). */
  public readonly sunDeclinationProperty: TReadOnlyProperty<number>;
  /** Sun right ascension α☉ (hours). */
  public readonly sunRightAscensionProperty: TReadOnlyProperty<number>;
  /** Noon Sun altitude at the observer latitude (°). */
  public readonly noonSunAltitudeProperty: TReadOnlyProperty<number>;
  /** Day-of-year (1..365.24). */
  public readonly dayOfYearProperty: TReadOnlyProperty<number>;
  /** Calendar month/day for the date readout. */
  public readonly monthDayProperty: TReadOnlyProperty<{ monthIndex: number; dayOfMonth: number }>;

  public constructor() {
    this.sunDeclinationProperty = new DerivedProperty([this.sunEclipticLongitudeProperty], (lambda) =>
      sunDeclinationDeg(lambda),
    );
    this.sunRightAscensionProperty = new DerivedProperty([this.sunEclipticLongitudeProperty], (lambda) =>
      sunRightAscensionHours(lambda),
    );
    this.noonSunAltitudeProperty = new DerivedProperty(
      [this.latitudeProperty, this.sunDeclinationProperty],
      (lat, dec) => noonSunAltitudeDeg(lat, dec),
    );
    this.dayOfYearProperty = new DerivedProperty([this.sunEclipticLongitudeProperty], (lambda) =>
      dayOfYearForEclipticLongitude(lambda),
    );
    this.monthDayProperty = new DerivedProperty([this.dayOfYearProperty], (day) => monthAndDayForDayOfYear(day));
  }

  public step(dt: number): void {
    this.timer.step(dt);
    if (this.timer.isPlayingProperty.value) {
      const delta = (360 / DAYS_PER_YEAR) * SEASONS_ANIMATION_DAYS_PER_SECOND * dt;
      const next = (this.sunEclipticLongitudeProperty.value + delta) % 360;
      this.sunEclipticLongitudeProperty.value = next < 0 ? next + 360 : next;
    }
  }

  public reset(): void {
    this.timer.reset();
    this.viewModeProperty.reset();
    this.earthViewModeProperty.reset();
    this.sunbeamModeProperty.reset();
    this.sunEclipticLongitudeProperty.reset();
    this.latitudeProperty.reset();
    this.subsolarPointVisibleProperty.reset();
    this.sphereLabelsVisibleProperty.reset();
    this.earthLabelsVisibleProperty.reset();
  }
}
