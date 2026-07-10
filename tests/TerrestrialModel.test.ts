/**
 * TerrestrialModel.test.ts
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from "../src/BasicCoordinatesAndSeasonsConstants.js";
import { TerrestrialModel } from "../src/terrestrial/model/TerrestrialModel.js";

describe("TerrestrialModel", () => {
  it("starts at the NAAP default location with reference circles hidden", () => {
    const model = new TerrestrialModel();
    expect(model.latitudeProperty.value).toBe(DEFAULT_LATITUDE);
    expect(model.longitudeProperty.value).toBe(DEFAULT_LONGITUDE);
    expect(model.referenceCirclesVisibleProperty.value).toBe(false);
  });

  it("resets every Property to its default", () => {
    const model = new TerrestrialModel();
    model.latitudeProperty.value = -12.3;
    model.longitudeProperty.value = 44.5;
    model.referenceCirclesVisibleProperty.value = true;
    model.reset();
    expect(model.latitudeProperty.value).toBe(DEFAULT_LATITUDE);
    expect(model.longitudeProperty.value).toBe(DEFAULT_LONGITUDE);
    expect(model.referenceCirclesVisibleProperty.value).toBe(false);
  });

  it("exposes the declared ranges", () => {
    const model = new TerrestrialModel();
    expect(model.latitudeProperty.range.min).toBe(-90);
    expect(model.latitudeProperty.range.max).toBe(90);
    expect(model.longitudeProperty.range.min).toBe(-180);
    expect(model.longitudeProperty.range.max).toBe(180);
  });

  it("step does not change state", () => {
    const model = new TerrestrialModel();
    model.step(1);
    expect(model.latitudeProperty.value).toBe(DEFAULT_LATITUDE);
    expect(model.longitudeProperty.value).toBe(DEFAULT_LONGITUDE);
  });
});
