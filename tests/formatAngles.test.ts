/**
 * formatAngles.test.ts
 */

import { describe, expect, it } from "vitest";
import { formatLatitude, formatLatitudeDMS, formatLongitude, formatLongitudeDMS } from "../src/common/formatAngles.js";

describe("formatLatitude", () => {
  it("uses N/S hemisphere letters with a positive magnitude", () => {
    expect(formatLatitude(40.8)).toBe("40.8° N");
    expect(formatLatitude(-33.87)).toBe("33.9° S");
    expect(formatLatitude(0)).toBe("0.0° N");
  });

  it("honours a custom decimal count and localized letters", () => {
    expect(formatLatitude(-12.345, 2)).toBe("12.35° S");
    expect(formatLatitude(-5, 0, { north: "N", south: "S", east: "E", west: "O" })).toBe("5° S");
  });
});

describe("formatLongitude", () => {
  it("uses E/W hemisphere letters with a positive magnitude", () => {
    expect(formatLongitude(-96.7)).toBe("96.7° W");
    expect(formatLongitude(151.21)).toBe("151.2° E");
    expect(formatLongitude(0)).toBe("0.0° E");
  });

  it("supports localized west letter (e.g. French/Spanish 'O')", () => {
    expect(formatLongitude(-96.7, 1, { north: "N", south: "S", east: "E", west: "O" })).toBe("96.7° O");
  });
});

describe("formatLatitudeDMS", () => {
  it("formats degrees + zero-padded minutes with a hemisphere letter", () => {
    expect(formatLatitudeDMS(40.8)).toBe("40° 48′ N");
    expect(formatLatitudeDMS(-33.9167)).toBe("33° 55′ S");
    expect(formatLatitudeDMS(0)).toBe("0° 00′ N");
  });

  it("floors minutes and drops seconds (rounding to the nearest arc-second first)", () => {
    // 40.8167° = 40° 49.002′ → 49′ (never 48′ from float noise).
    expect(formatLatitudeDMS(40.8167)).toBe("40° 49′ N");
    expect(formatLatitudeDMS(90)).toBe("90° 00′ N");
  });

  it("honours localized letters", () => {
    expect(formatLatitudeDMS(-5.5, { north: "N", south: "S", east: "E", west: "O" })).toBe("5° 30′ S");
  });
});

describe("formatLongitudeDMS", () => {
  it("formats degrees + zero-padded minutes with a hemisphere letter", () => {
    expect(formatLongitudeDMS(-96.6667)).toBe("96° 40′ W");
    expect(formatLongitudeDMS(116.3833)).toBe("116° 23′ E");
    expect(formatLongitudeDMS(0)).toBe("0° 00′ E");
    expect(formatLongitudeDMS(-180)).toBe("180° 00′ W");
  });

  it("supports a localized west letter", () => {
    expect(formatLongitudeDMS(-96.6667, { north: "N", south: "S", east: "E", west: "O" })).toBe("96° 40′ O");
  });
});
