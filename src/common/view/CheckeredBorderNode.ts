/**
 * CheckeredBorderNode.ts
 *
 * A cartographic "neatline" — an alternating black/white checkered frame drawn just
 * inside the edges of a width × height map rectangle, matching the NAAP flat-map
 * explorers. The top and bottom edges are split into `segmentsX` cells and the left
 * and right edges into `segmentsY` cells; adjacent cells alternate colour, and the
 * corners overlap so the frame reads as continuous. Non-interactive decoration.
 */

import { Shape } from "scenerystack/kite";
import { Node, Path } from "scenerystack/scenery";

export type CheckeredBorderNodeOptions = {
  /** Frame thickness in px. */
  thickness?: number;
  /** Number of alternating cells along the top and bottom edges. */
  segmentsX?: number;
  /** Number of alternating cells along the left and right edges. */
  segmentsY?: number;
  darkColor?: string;
  lightColor?: string;
};

export class CheckeredBorderNode extends Node {
  public constructor(mapWidth: number, mapHeight: number, options?: CheckeredBorderNodeOptions) {
    const thickness = options?.thickness ?? 7;
    const segmentsX = options?.segmentsX ?? 24;
    const segmentsY = options?.segmentsY ?? 12;
    const darkColor = options?.darkColor ?? "black";
    const lightColor = options?.lightColor ?? "white";

    // Two shapes (one per colour); cells alternate by index along each edge.
    const dark = new Shape();
    const light = new Shape();

    const addCell = (x: number, y: number, w: number, h: number, index: number): void => {
      (index % 2 === 0 ? dark : light).rect(x, y, w, h);
    };

    const cellW = mapWidth / segmentsX;
    for (let i = 0; i < segmentsX; i++) {
      addCell(i * cellW, 0, cellW, thickness, i); // top
      addCell(i * cellW, mapHeight - thickness, cellW, thickness, i + 1); // bottom (offset phase)
    }
    const cellH = mapHeight / segmentsY;
    for (let j = 0; j < segmentsY; j++) {
      addCell(0, j * cellH, thickness, cellH, j); // left
      addCell(mapWidth - thickness, j * cellH, thickness, cellH, j + 1); // right (offset phase)
    }

    super({
      pickable: false,
      children: [new Path(dark, { fill: darkColor }), new Path(light, { fill: lightColor })],
    });
  }
}
