/**
 * TerrestrialMapNode.ts
 *
 * The flat map for the Terrestrial screen: the shared draggable FlatEarthMapNode
 * plus a toggleable overlay of the tropic (±23.4°) and polar (±66.6°) reference
 * circles. These are drawn here — not in the shared FlatEarthMapNode — because
 * they are specific to this screen's pedagogy. The equator is already drawn by
 * FlatEarthMapNode.
 */

import type { NumberProperty, TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Node, Path } from "scenerystack/scenery";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import type { EarthMapResolution } from "../../BasicCoordinatesAndSeasonsConstants.js";
import { OBLIQUITY_DEGREES } from "../../BasicCoordinatesAndSeasonsConstants.js";
import { FlatEarthMapNode } from "../../common/view/FlatEarthMapNode.js";

export type TerrestrialMapNodeOptions = { width: number; height: number };

export class TerrestrialMapNode extends Node {
  /** The wrapped draggable map (exposed so callers can put it in the pdomOrder). */
  public readonly map: FlatEarthMapNode;

  public constructor(
    latitudeProperty: NumberProperty,
    longitudeProperty: NumberProperty,
    earthMapResolutionProperty: TReadOnlyProperty<EarthMapResolution>,
    referenceCirclesVisibleProperty: TReadOnlyProperty<boolean>,
    options: TerrestrialMapNodeOptions,
  ) {
    const { width, height } = options;

    const map = new FlatEarthMapNode(latitudeProperty, longitudeProperty, earthMapResolutionProperty, {
      width,
      height,
    });

    const latToY = (lat: number): number => ((90 - lat) / 180) * height;
    const polarCircleLatitude = 90 - OBLIQUITY_DEGREES; // 66.6°
    const referenceShape = new Shape();
    for (const lat of [OBLIQUITY_DEGREES, -OBLIQUITY_DEGREES, polarCircleLatitude, -polarCircleLatitude]) {
      referenceShape.moveTo(0, latToY(lat)).lineTo(width, latToY(lat));
    }
    const referenceLines = new Path(referenceShape, {
      stroke: BasicCoordinatesAndSeasonsColors.accentColorProperty,
      lineWidth: 1,
      lineDash: [4, 3],
      opacity: 0.85,
      clipArea: Shape.rect(0, 0, width, height),
    });
    referenceCirclesVisibleProperty.link((visible) => {
      referenceLines.visible = visible;
    });

    super({ children: [map, referenceLines] });

    this.map = map;
  }
}
