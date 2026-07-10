/**
 * SunMarkerNode.ts
 *
 * A Sun disk placed on the celestial sphere at the Sun's current right ascension
 * and declination, so it visibly rides the tilted ecliptic as the year advances
 * (the geometric picture of sin δ☉ = sin ε · sin λ☉). Dimmed when it rotates to
 * the far side of the sphere.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Circle, Node } from "scenerystack/scenery";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { raDecToVector3 } from "../../common/SkyCoordinates.js";
import type { SkyProjection } from "../../common/SkyProjection.js";

const SUN_RADIUS = 8;

export class SunMarkerNode extends Node {
  public constructor(
    projection: SkyProjection,
    sunRightAscensionProperty: TReadOnlyProperty<number>,
    sunDeclinationProperty: TReadOnlyProperty<number>,
  ) {
    const sun = new Circle(SUN_RADIUS, {
      fill: BasicCoordinatesAndSeasonsColors.sunColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      lineWidth: 1,
    });

    super({ children: [sun] });

    Multilink.multilink(
      [projection.viewMatrixProperty, sunRightAscensionProperty, sunDeclinationProperty],
      (_matrix, raHours, decDeg) => {
        const v = raDecToVector3(raHours, decDeg);
        sun.center = projection.project(v);
        sun.opacity = projection.isFrontFacing(v) ? 1 : 0.25;
      },
    );
  }
}
