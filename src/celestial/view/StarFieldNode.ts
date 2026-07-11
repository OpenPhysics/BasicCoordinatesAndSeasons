/**
 * StarFieldNode.ts
 *
 * Renders the NAAP bright-star catalog (~4,100 stars, mag ≤ 5.8) as dots on the
 * celestial sphere. Front-facing stars (depth ≥ 0) are drawn solid in
 * {@link frontLayer}; back-facing stars are drawn dim in {@link backLayer} so the
 * transparent sphere reads as 3-D. Star radius scales with brightness
 * (brighter = larger), matching the NAAP convention `10 × (7 − mag)`.
 *
 * Re-projects whenever the view matrix (camera ∘ frame) changes, using the same
 * `projectWithDepth` pipeline as {@link CelestialSphereNode}.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import type { Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path } from "scenerystack/scenery";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { raDecToVector3 } from "../../common/SkyCoordinates.js";
import type { SkyProjection } from "../../common/SkyProjection.js";
import {
  BRIGHT_STAR_COUNT,
  BRIGHT_STAR_DEC_DEG,
  BRIGHT_STAR_MAG,
  BRIGHT_STAR_RA_HOURS,
} from "../model/BrightStarCatalog.js";

export type StarFieldNodeOptions = {
  /** Toggles the starfield on/off. Defaults to always visible. */
  visibleProperty?: TReadOnlyProperty<boolean>;
};

/** Star dot radius (px) from visual magnitude — brighter stars are larger. */
export function magToRadius(mag: number): number {
  return Math.max(0.4, 2.4 - 0.32 * mag);
}

type StarEntry = { vector: Vector3; radius: number };

/** Pre-compute each star's world unit vector + render radius once (not per redraw). */
function buildStarEntries(): StarEntry[] {
  const entries: StarEntry[] = [];
  for (let i = 0; i < BRIGHT_STAR_COUNT; i++) {
    const ra = BRIGHT_STAR_RA_HOURS[i];
    const dec = BRIGHT_STAR_DEC_DEG[i];
    const mag = BRIGHT_STAR_MAG[i];
    if (ra !== undefined && dec !== undefined && mag !== undefined) {
      entries.push({ vector: raDecToVector3(ra, dec), radius: magToRadius(mag) });
    }
  }
  return entries;
}

export class StarFieldNode extends Node {
  /** Dim far-side stars — paint before the opaque sphere fill. */
  public readonly backLayer: Node;
  /** Solid near-side stars — paint after the sphere fill. */
  public readonly frontLayer: Node;

  public constructor(projection: SkyProjection, options?: StarFieldNodeOptions) {
    super();

    const stars = buildStarEntries();

    const starColor = BasicCoordinatesAndSeasonsColors.starColorProperty;
    const frontPath = new Path(null, { fill: starColor });
    const backPath = new Path(null, { fill: starColor, opacity: 0.18 });

    this.backLayer = new Node({ children: [backPath] });
    this.frontLayer = new Node({ children: [frontPath] });

    const redraw = (): void => {
      const frontShape = new Shape();
      const backShape = new Shape();
      for (const star of stars) {
        const projected = projection.projectWithDepth(star.vector);
        if (projected.depth >= 0) {
          frontShape.circle(projected.point.x, projected.point.y, star.radius);
        } else {
          backShape.circle(projected.point.x, projected.point.y, star.radius * 0.6);
        }
      }
      frontPath.shape = frontShape;
      backPath.shape = backShape;
    };

    Multilink.multilink([projection.viewMatrixProperty], redraw);
    redraw();

    if (options?.visibleProperty) {
      options.visibleProperty.link((visible) => {
        this.visible = visible;
      });
    }
  }
}
