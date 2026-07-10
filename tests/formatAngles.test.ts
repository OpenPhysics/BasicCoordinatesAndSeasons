/**
 * formatAngles.test.ts
 */

import { describe, expect, it } from "vitest";
import { formatLatitude, formatLongitude } from "../src/common/formatAngles.js";

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
