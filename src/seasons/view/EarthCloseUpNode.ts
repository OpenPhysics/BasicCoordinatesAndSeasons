/**
 * EarthCloseUpNode.ts
 *
 * A side-on close-up of the Earth with the Sun far to the right (horizontal
 * parallel rays). The day hemisphere is the right half, night the left, split by
 * a vertical terminator. The latitude grid (equator + tropics) is tilted by the
 * Sun's declination δ, so the subsolar point (screen-rightmost, sun overhead)
 * sits at latitude δ; the observer marker rides the sunward limb at latitude φ,
 * where the angle between the horizontal ray and the local vertical is the noon
 * Sun altitude 90° − |φ − δ|.
 */

import { Multilink } from "scenerystack/axon";
import { Matrix3, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path } from "scenerystack/scenery";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { OBLIQUITY_DEGREES } from "../../BasicCoordinatesAndSeasonsConstants.js";
import { degToRad } from "../../common/SkyCoordinates.js";
import type { SeasonsModel } from "../model/SeasonsModel.js";

export type EarthCloseUpNodeOptions = { radius: number };

/** A latitude small-circle projected onto the side view as an ellipse. */
const latitudeEllipse = (radius: number, latitudeDeg: number): Shape => {
  const lat = degToRad(latitudeDeg);
  const ringRadius = radius * Math.cos(lat); // half-width of the parallel
  const centerY = -radius * Math.sin(lat); // height of the parallel's centre
  // Edge-on, a parallel projects to a thin ellipse (vertical semi-axis ≈ 18% width).
  return Shape.ellipse(0, centerY, ringRadius, ringRadius * 0.18, 0);
};

export class EarthCloseUpNode extends Node {
  public constructor(model: SeasonsModel, options: EarthCloseUpNodeOptions) {
    const r = options.radius;

    const earth = new Circle(r, {
      fill: BasicCoordinatesAndSeasonsColors.earthOceanColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      lineWidth: 1,
    });

    // Night hemisphere: the left half (terminator is the vertical diameter).
    const night = new Path(
      new Shape()
        .moveTo(0, -r)
        .arc(0, 0, r, -Math.PI / 2, Math.PI / 2, true)
        .close(),
      { fill: BasicCoordinatesAndSeasonsColors.terminatorShadeColorProperty },
    );

    // Tilted latitude grid (rotated by δ), redrawn each frame.
    const grid = new Path(null, {
      stroke: BasicCoordinatesAndSeasonsColors.gridColorProperty,
      lineWidth: 0.75,
      opacity: 0.8,
    });
    const northAxis = new Path(null, { stroke: "#ff5252", lineWidth: 2 });
    const southAxis = new Path(null, { stroke: "#5b8dd6", lineWidth: 2 });

    // Sun rays from the right.
    const rays = new Shape();
    for (const yFrac of [-0.6, -0.2, 0.2, 0.6]) {
      const y = yFrac * r;
      rays.moveTo(r + 46, y).lineTo(r + 8, y);
    }
    const raysPath = new Path(rays, { stroke: BasicCoordinatesAndSeasonsColors.sunbeamColorProperty, lineWidth: 1.5 });

    const subsolarDot = new Circle(4, {
      fill: BasicCoordinatesAndSeasonsColors.sunColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      lineWidth: 0.5,
    });
    const observerDot = new Circle(4, {
      fill: BasicCoordinatesAndSeasonsColors.observerColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      lineWidth: 0.5,
    });

    super({ children: [earth, night, grid, southAxis, northAxis, raysPath, subsolarDot, observerDot] });

    Multilink.multilink(
      [model.sunDeclinationProperty, model.latitudeProperty, model.subsolarPointVisibleProperty],
      (dec, latitude, subsolarVisible) => {
        const tilt = degToRad(dec); // N pole leans toward the Sun (right) by δ.
        const rot = Matrix3.rotationZ(tilt);

        // Latitude grid: equator + tropics, tilted by δ.
        const gridShape = new Shape();
        for (const lat of [0, OBLIQUITY_DEGREES, -OBLIQUITY_DEGREES]) {
          gridShape.subpaths.push(...latitudeEllipse(r, lat).transformed(rot).subpaths);
        }
        grid.shape = gridShape;

        // Rotation axis, tilted by δ.
        const north = rot.timesVector2(new Vector2(0, -r));
        northAxis.shape = new Shape().moveTo(0, 0).lineTo(north.x, north.y);
        southAxis.shape = new Shape().moveTo(0, 0).lineTo(-north.x, -north.y);

        // Subsolar point: sun overhead → screen-rightmost point (latitude δ).
        subsolarDot.center = new Vector2(r, 0);
        subsolarDot.visible = subsolarVisible;

        // Observer at latitude φ on the sunward limb: screen angle (φ − δ) from horizontal.
        const beta = degToRad(latitude - dec);
        observerDot.center = new Vector2(r * Math.cos(beta), -r * Math.sin(beta));
      },
    );
  }
}
