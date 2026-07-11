/**
 * StickFigureNode.ts
 *
 * A small stick-figure observer marker (round head, torso, two arms, two legs)
 * standing with its feet at the node origin (0, 0) and its head pointing along
 * local −y ("up"). Rotate and translate the node to plant the figure on a
 * surface: put the feet at the contact point and align local −y with the local
 * vertical (radially outward from the globe centre). Used on the Seasons screen
 * in place of a plain observer dot, matching the NAAP simulator.
 */

import { Shape } from "scenerystack/kite";
import { Circle, Node, type NodeOptions, Path, type TPaint } from "scenerystack/scenery";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";

export type StickFigureNodeOptions = {
  /** Overall figure height in view units (feet to top of head). Default 20. */
  height?: number;
  /** Stroke/fill colour of the figure. Default the shared observer colour. */
  color?: TPaint;
} & NodeOptions;

export class StickFigureNode extends Node {
  public constructor(providedOptions?: StickFigureNodeOptions) {
    const {
      height = 20,
      color = BasicCoordinatesAndSeasonsColors.observerColorProperty,
      ...nodeOptions
    } = providedOptions ?? {};

    // Proportions as fractions of the total height, measured up (−y) from the feet at y = 0.
    const hipY = -0.42 * height;
    const shoulderY = -0.72 * height;
    const headRadius = 0.13 * height;
    const headCenterY = shoulderY - headRadius - 0.02 * height;
    const armSpan = 0.24 * height;
    const armDrop = 0.1 * height;
    const legSpread = 0.18 * height;
    const lineWidth = Math.max(1.2, 0.09 * height);

    const limbs = new Path(
      new Shape()
        // torso (neck → hips)
        .moveTo(0, shoulderY)
        .lineTo(0, hipY)
        // arms (shoulder-out on both sides)
        .moveTo(-armSpan, shoulderY + armDrop)
        .lineTo(0, shoulderY)
        .lineTo(armSpan, shoulderY + armDrop)
        // legs (hips → feet on the ground line y = 0)
        .moveTo(-legSpread, 0)
        .lineTo(0, hipY)
        .lineTo(legSpread, 0),
      { stroke: color, lineWidth, lineCap: "round", lineJoin: "round" },
    );

    const head = new Circle(headRadius, { fill: color, centerX: 0, centerY: headCenterY });

    super({ children: [limbs, head] });

    this.mutate(nodeOptions);
  }
}
