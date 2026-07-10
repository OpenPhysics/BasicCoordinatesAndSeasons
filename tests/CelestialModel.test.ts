/**
 * CelestialModel.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  CelestialModel,
  DEFAULT_STAR_DEC_DEGREES,
  DEFAULT_STAR_RA_HOURS,
} from "../src/celestial/model/CelestialModel.js";

describe("CelestialModel", () => {
  it("starts at the default star position with default toggles", () => {
    const model = new CelestialModel();
    expect(model.starRaProperty.value).toBe(DEFAULT_STAR_RA_HOURS);
    expect(model.starDecProperty.value).toBe(DEFAULT_STAR_DEC_DEGREES);
    expect(model.constellationsVisibleProperty.value).toBe(false);
    expect(model.gridVisibleProperty.value).toBe(true);
    expect(model.celestialEquatorVisibleProperty.value).toBe(true);
    expect(model.eclipticVisibleProperty.value).toBe(false);
  });

  it("exposes RA [0,24) and Dec [-90,90] ranges", () => {
    const model = new CelestialModel();
    expect(model.starRaProperty.range.min).toBe(0);
    expect(model.starRaProperty.range.max).toBe(24);
    expect(model.starDecProperty.range.min).toBe(-90);
    expect(model.starDecProperty.range.max).toBe(90);
  });

  it("resets every Property to its default", () => {
    const model = new CelestialModel();
    model.starRaProperty.value = 15.5;
    model.starDecProperty.value = -42;
    model.constellationsVisibleProperty.value = true;
    model.gridVisibleProperty.value = false;
    model.eclipticVisibleProperty.value = true;
    model.reset();
    expect(model.starRaProperty.value).toBe(DEFAULT_STAR_RA_HOURS);
    expect(model.starDecProperty.value).toBe(DEFAULT_STAR_DEC_DEGREES);
    expect(model.constellationsVisibleProperty.value).toBe(false);
    expect(model.gridVisibleProperty.value).toBe(true);
    expect(model.eclipticVisibleProperty.value).toBe(false);
  });
});
