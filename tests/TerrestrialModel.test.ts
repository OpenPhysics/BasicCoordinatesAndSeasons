/**
 * TerrestrialModel.test.ts
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from "../src/BasicCoordinatesAndSeasonsConstants.js";
import { TerrestrialModel } from "../src/terrestrial/model/TerrestrialModel.js";

describe("TerrestrialModel", () => {
  it("starts at the NAAP default location with map view state at defaults", () => {
    const model = new TerrestrialModel();
    expect(model.latitudeProperty.value).toBe(DEFAULT_LATITUDE);
    expect(model.longitudeProperty.value).toBe(DEFAULT_LONGITUDE);
    expect(model.mapCenterLongitudeProperty.value).toBe(0);
    expect(model.showCitiesProperty.value).toBe(false);
    expect(model.mapFeaturesVisibleProperty.value).toBe(false);
    expect(model.coordinateFormatProperty.value).toBe("decimal");
  });

  it("resets every Property to its default", () => {
    const model = new TerrestrialModel();
    model.latitudeProperty.value = -12.3;
    model.longitudeProperty.value = 44.5;
    model.mapCenterLongitudeProperty.value = 135;
    model.showCitiesProperty.value = true;
    model.mapFeaturesVisibleProperty.value = true;
    model.coordinateFormatProperty.value = "sexagesimal";
    model.reset();
    expect(model.latitudeProperty.value).toBe(DEFAULT_LATITUDE);
    expect(model.longitudeProperty.value).toBe(DEFAULT_LONGITUDE);
    expect(model.mapCenterLongitudeProperty.value).toBe(0);
    expect(model.showCitiesProperty.value).toBe(false);
    expect(model.mapFeaturesVisibleProperty.value).toBe(false);
    expect(model.coordinateFormatProperty.value).toBe("decimal");
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
