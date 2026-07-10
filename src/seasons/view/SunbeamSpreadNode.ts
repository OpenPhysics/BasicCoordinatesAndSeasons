/**
 * SunbeamSpreadNode.ts
 *
 * The angle-of-incidence panel: a fixed-width bundle of parallel Sun rays strikes
 * the ground at the observer's noon Sun altitude h. The lit footprint on the
 * ground has width ∝ 1/sin(h), so the same energy spreads over more ground (and
 * warms it less) at low Sun angles. Hidden during polar night (h ≤ 0).
 */

import { Multilink } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Line, Node, Path } from "scenerystack/scenery";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { degToRad } from "../../common/SkyCoordinates.js";
import type { SeasonsModel } from "../model/SeasonsModel.js";

export type SunbeamSpreadNodeOptions = { width: number; height: number };

const BEAM_WIDTH = 44; // fixed perpendicular cross-section of the beam (px)
const RAY_COUNT = 5;

export class SunbeamSpreadNode extends Node {
  public constructor(model: SeasonsModel, options: SunbeamSpreadNodeOptions) {
    const { width, height } = options;
    const groundY = height / 2;
    const maxFootprint = width - 20;

    const ground = new Line(-width / 2, groundY, width / 2, groundY, {
      stroke: BasicCoordinatesAndSeasonsColors.earthLandColorProperty,
      lineWidth: 3,
    });
    const footprint = new Line(0, groundY, 0, groundY, {
      stroke: BasicCoordinatesAndSeasonsColors.sunColorProperty,
      lineWidth: 6,
    });
    const rays = new Path(null, {
      stroke: BasicCoordinatesAndSeasonsColors.sunbeamColorProperty,
      lineWidth: 2,
    });

    super({ children: [ground, footprint, rays] });

    Multilink.multilink([model.noonSunAltitudeProperty], (altitude) => {
      const visible = altitude > 0;
      footprint.visible = visible;
      rays.visible = visible;
      if (!visible) {
        return;
      }
      const h = degToRad(altitude);
      // Footprint width from the fixed beam cross-section: BEAM_WIDTH / sin(h).
      const footprintWidth = Math.min(maxFootprint, BEAM_WIDTH / Math.sin(h));
      footprint.setLine(-footprintWidth / 2, groundY, footprintWidth / 2, groundY);

      // Parallel rays coming down toward the ground at altitude h (from upper right).
      const dir = { x: Math.cos(h), y: Math.sin(h) }; // up-and-to-the-right (reverse of travel)
      const rayLength = height * 0.9;
      const shape = new Shape();
      for (let i = 0; i < RAY_COUNT; i++) {
        const t = i / (RAY_COUNT - 1);
        const groundX = -footprintWidth / 2 + t * footprintWidth;
        shape.moveTo(groundX, groundY).lineTo(groundX + dir.x * rayLength, groundY - dir.y * rayLength);
      }
      rays.shape = shape;
    });
  }
}
