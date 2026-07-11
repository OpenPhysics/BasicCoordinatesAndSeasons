/**
 * SeasonsModel.test.ts
 */

import { describe, expect, it } from "vitest";
import { eclipticLongitudeForDayOfYear } from "../src/common/SunPosition.js";
import { SeasonsModel } from "../src/seasons/model/SeasonsModel.js";

const OBLIQUITY = 23.4;
// The model's initial Sun position matches the NAAP reset date, day-of-year 41 (Feb 10).
const DEFAULT_ECLIPTIC_LONGITUDE = eclipticLongitudeForDayOfYear(41);

describe("SeasonsModel derived quantities", () => {
  it("gives the cardinal declination / right ascension values", () => {
    const model = new SeasonsModel();
    const at = (lambda: number): { dec: number; ra: number } => {
      model.sunEclipticLongitudeProperty.value = lambda;
      return { dec: model.sunDeclinationProperty.value, ra: model.sunRightAscensionProperty.value };
    };
    expect(at(0)).toMatchObject({ dec: expect.closeTo(0, 6), ra: expect.closeTo(0, 6) });
    expect(at(90)).toMatchObject({ dec: expect.closeTo(OBLIQUITY, 6), ra: expect.closeTo(6, 6) });
    expect(at(180)).toMatchObject({ dec: expect.closeTo(0, 6), ra: expect.closeTo(12, 6) });
    expect(at(270)).toMatchObject({ dec: expect.closeTo(-OBLIQUITY, 6), ra: expect.closeTo(18, 6) });
  });

  it("computes noon altitude at latitude 40° for solstices/equinoxes", () => {
    const model = new SeasonsModel();
    model.latitudeProperty.value = 40;
    model.sunEclipticLongitudeProperty.value = 90; // June solstice
    expect(model.noonSunAltitudeProperty.value).toBeCloseTo(73.4, 6);
    model.sunEclipticLongitudeProperty.value = 0; // equinox
    expect(model.noonSunAltitudeProperty.value).toBeCloseTo(50, 6);
    model.sunEclipticLongitudeProperty.value = 270; // December solstice
    expect(model.noonSunAltitudeProperty.value).toBeCloseTo(26.6, 6);
  });

  it("puts the June solstice date in June", () => {
    const model = new SeasonsModel();
    model.sunEclipticLongitudeProperty.value = 90;
    expect(model.monthDayProperty.value.monthIndex).toBe(5); // June
  });
});

describe("SeasonsModel stepping", () => {
  it("does not advance while paused", () => {
    const model = new SeasonsModel();
    model.timer.isPlayingProperty.value = false;
    model.step(1);
    expect(model.sunEclipticLongitudeProperty.value).toBe(DEFAULT_ECLIPTIC_LONGITUDE);
  });

  it("advances the ecliptic longitude while playing", () => {
    const model = new SeasonsModel();
    model.sunEclipticLongitudeProperty.value = 0;
    model.timer.isPlayingProperty.value = true;
    model.step(1); // ~5 days ≈ 5*360/365.24 ≈ 4.93°
    expect(model.sunEclipticLongitudeProperty.value).toBeGreaterThan(4);
    expect(model.sunEclipticLongitudeProperty.value).toBeLessThan(6);
  });

  it("wraps past 360° while playing", () => {
    const model = new SeasonsModel();
    model.sunEclipticLongitudeProperty.value = 359;
    model.timer.isPlayingProperty.value = true;
    model.step(1); // +~4.93° → wraps to ~3.93°
    expect(model.sunEclipticLongitudeProperty.value).toBeGreaterThanOrEqual(0);
    expect(model.sunEclipticLongitudeProperty.value).toBeLessThan(10);
  });

  it("resets everything to defaults", () => {
    const model = new SeasonsModel();
    model.sunEclipticLongitudeProperty.value = 123;
    model.latitudeProperty.value = -20;
    model.timer.isPlayingProperty.value = true;
    model.subsolarPointVisibleProperty.value = false;
    model.reset();
    expect(model.sunEclipticLongitudeProperty.value).toBe(DEFAULT_ECLIPTIC_LONGITUDE);
    expect(model.latitudeProperty.value).toBe(40.8);
    expect(model.timer.isPlayingProperty.value).toBe(false);
    expect(model.subsolarPointVisibleProperty.value).toBe(true);
  });
});
