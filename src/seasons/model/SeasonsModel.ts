/**
 * SeasonsModel.ts
 *
 * State for the Seasons screen. The canonical state is the Sun's ecliptic
 * longitude λ☉ (0° = March equinox); day-of-year, declination, right ascension,
 * and noon Sun altitude are all derived from it (and the observer latitude) via
 * SunPosition.ts. A composed TimeModel drives play/pause; while playing, `step`
 * advances λ☉ at SEASONS_ANIMATION_DAYS_PER_SECOND.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
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
  monthAndDayForDayOfYear,
  noonSunAltitudeDeg,
  sunDeclinationDeg,
  sunRightAscensionHours,
} from "../../common/SunPosition.js";
import { TimeModel } from "../../common/TimeModel.js";

export const ECLIPTIC_LONGITUDE_RANGE = new Range(0, 360);

export class SeasonsModel implements TModel {
  /** Play/pause + elapsed-time clock. */
  public readonly timer = new TimeModel();

  /** Canonical state: the Sun's ecliptic longitude λ☉ (°, 0 = March equinox). */
  public readonly sunEclipticLongitudeProperty = new NumberProperty(0, { range: ECLIPTIC_LONGITUDE_RANGE, units: "°" });

  /** The observer latitude whose noon Sun altitude is shown (°, +N). */
  public readonly latitudeProperty = new NumberProperty(DEFAULT_LATITUDE, { range: LATITUDE_RANGE, units: "°" });

  /** Whether the subsolar-point marker is shown (NAAP default: on). */
  public readonly subsolarPointVisibleProperty = new BooleanProperty(true);

  /** Whether the ecliptic is shown. */
  public readonly eclipticVisibleProperty = new BooleanProperty(true);

  /** Whether the celestial equator is shown. */
  public readonly celestialEquatorVisibleProperty = new BooleanProperty(true);

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
    this.sunEclipticLongitudeProperty.reset();
    this.latitudeProperty.reset();
    this.subsolarPointVisibleProperty.reset();
    this.eclipticVisibleProperty.reset();
    this.celestialEquatorVisibleProperty.reset();
  }
}
