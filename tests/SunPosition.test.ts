/**
 * SunPosition.test.ts
 *
 * Pins the solar-position math against the cardinal points of the year and the
 * worked examples in doc/naap-control-inventory.md.
 */

import { describe, expect, it } from "vitest";
import {
  dayOfYearForEclipticLongitude,
  eclipticLongitudeForDayOfYear,
  MARCH_EQUINOX_DAY,
  monthAndDayForDayOfYear,
  noonSunAltitudeDeg,
  sunDeclinationDeg,
  sunRightAscensionHours,
} from "../src/common/SunPosition.js";

const OBLIQUITY = 23.4;

describe("sunDeclinationDeg", () => {
  it("is 0 at the equinoxes and ±ε at the solstices", () => {
    expect(sunDeclinationDeg(0)).toBeCloseTo(0, 6);
    expect(sunDeclinationDeg(90)).toBeCloseTo(OBLIQUITY, 6);
    expect(sunDeclinationDeg(180)).toBeCloseTo(0, 6);
    expect(sunDeclinationDeg(270)).toBeCloseTo(-OBLIQUITY, 6);
  });

  it("is maximal at λ = 90° (compared with its neighbours)", () => {
    expect(sunDeclinationDeg(90)).toBeGreaterThan(sunDeclinationDeg(89));
    expect(sunDeclinationDeg(90)).toBeGreaterThan(sunDeclinationDeg(91));
  });
});

describe("sunRightAscensionHours", () => {
  it("is 0/6/12/18 h at the cardinal ecliptic longitudes", () => {
    expect(sunRightAscensionHours(0)).toBeCloseTo(0, 6);
    expect(sunRightAscensionHours(90)).toBeCloseTo(6, 6);
    expect(sunRightAscensionHours(180)).toBeCloseTo(12, 6);
    expect(sunRightAscensionHours(270)).toBeCloseTo(18, 6);
  });
});

describe("noonSunAltitudeDeg", () => {
  it("matches the worked latitude-40° cases", () => {
    expect(noonSunAltitudeDeg(40, OBLIQUITY)).toBeCloseTo(73.4, 6); // June solstice
    expect(noonSunAltitudeDeg(40, 0)).toBeCloseTo(50, 6); // equinox
    expect(noonSunAltitudeDeg(40, -OBLIQUITY)).toBeCloseTo(26.6, 6); // December solstice
  });

  it("goes negative during polar night", () => {
    expect(noonSunAltitudeDeg(90, -OBLIQUITY)).toBeCloseTo(-OBLIQUITY, 6);
  });

  it("reproduces the equator equinox/solstice values from the student guide", () => {
    expect(noonSunAltitudeDeg(0, 0)).toBeCloseTo(90, 6);
    expect(noonSunAltitudeDeg(0, OBLIQUITY)).toBeCloseTo(90 - OBLIQUITY, 6);
  });
});

describe("day ↔ ecliptic longitude", () => {
  it("puts λ = 0 at the March equinox day", () => {
    expect(eclipticLongitudeForDayOfYear(MARCH_EQUINOX_DAY)).toBeCloseTo(0, 6);
    expect(dayOfYearForEclipticLongitude(0)).toBeCloseTo(MARCH_EQUINOX_DAY, 6);
  });

  it("round-trips day → longitude → day for several days", () => {
    for (const day of [1, 40, 79.25, 172, 200, 265, 355, 365]) {
      expect(dayOfYearForEclipticLongitude(eclipticLongitudeForDayOfYear(day))).toBeCloseTo(day, 6);
    }
  });

  it("places the June solstice (λ = 90°) in late June", () => {
    const { monthIndex } = monthAndDayForDayOfYear(dayOfYearForEclipticLongitude(90));
    expect(monthIndex).toBe(5); // June
  });
});

describe("monthAndDayForDayOfYear", () => {
  it("maps the boundary days correctly (non-leap year)", () => {
    expect(monthAndDayForDayOfYear(1)).toEqual({ monthIndex: 0, dayOfMonth: 1 }); // Jan 1
    expect(monthAndDayForDayOfYear(32)).toEqual({ monthIndex: 1, dayOfMonth: 1 }); // Feb 1
    expect(monthAndDayForDayOfYear(60)).toEqual({ monthIndex: 2, dayOfMonth: 1 }); // Mar 1
    expect(monthAndDayForDayOfYear(365)).toEqual({ monthIndex: 11, dayOfMonth: 31 }); // Dec 31
  });

  it("floors fractional days and wraps out-of-range days", () => {
    expect(monthAndDayForDayOfYear(79.9)).toEqual({ monthIndex: 2, dayOfMonth: 20 }); // Mar 20
    expect(monthAndDayForDayOfYear(366)).toEqual({ monthIndex: 0, dayOfMonth: 1 }); // wraps to Jan 1
  });
});
