/**
 * FlatSkyMapNode.ts
 *
 * A flat equatorial sky chart mapping right ascension (x) × declination (y),
 * following the standard star-chart convention: RA increases to the LEFT (0ʰ at
 * the right edge), Dec +90° at the top → −90° at the bottom. Shows a grid, axis
 * labels, the zodiac constellation stick figures, and a draggable star marker
 * bound to the model's RA/Dec (mouse drag + arrow keys).
 */

import { Multilink, type PhetioProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { DragListener, KeyboardListener, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { CONTROL_FONT_SIZE, STAR_RADIUS } from "../../BasicCoordinatesAndSeasonsConstants.js";
import BasicCoordinatesAndSeasonsHotkeyData from "../../common/BasicCoordinatesAndSeasonsHotkeyData.js";
import { normalizeHours } from "../../common/SkyCoordinates.js";
import { createStarShape } from "../../common/view/starGraphics.js";
import {
  BRIGHT_STAR_COUNT,
  BRIGHT_STAR_DEC_DEG,
  BRIGHT_STAR_MAG,
  BRIGHT_STAR_RA_HOURS,
} from "../model/BrightStarCatalog.js";
import { ZODIAC_CONSTELLATIONS } from "../model/ZodiacConstellations.js";
import { magToRadius } from "./StarFieldNode.js";

export type FlatSkyMapNodeOptions = {
  width: number;
  height: number;
  accessibleName: TReadOnlyProperty<string>;
  accessibleHelpText?: TReadOnlyProperty<string>;
};

const RA_GRID_STEP_HOURS = 3;
const DEC_GRID_STEP_DEG = 30;
const RA_STEP_HOURS = 0.25;
const DEC_STEP_DEG = 1;

export class FlatSkyMapNode extends Node {
  public constructor(
    raProperty: PhetioProperty<number>,
    decProperty: PhetioProperty<number>,
    constellationsVisibleProperty: TReadOnlyProperty<boolean>,
    options: FlatSkyMapNodeOptions,
  ) {
    const { width, height } = options;

    // RA increases to the left (0ʰ at the right edge); Dec +90° top → −90° bottom.
    const raToX = (raHours: number): number => (width * (24 - raHours)) / 24;
    const decToY = (decDeg: number): number => (height * (90 - decDeg)) / 180;
    const xToRa = (x: number): number => 24 - (24 * x) / width;
    const yToDec = (y: number): number => 90 - (180 * y) / height;

    const border = new Rectangle(0, 0, width, height, {
      fill: BasicCoordinatesAndSeasonsColors.panelBackgroundColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.sphereOutlineColorProperty,
      lineWidth: 1,
    });

    // Grid lines.
    const gridShape = new Shape();
    for (let ra = 0; ra <= 24; ra += RA_GRID_STEP_HOURS) {
      gridShape.moveTo(raToX(ra), 0).lineTo(raToX(ra), height);
    }
    for (let dec = -90; dec <= 90; dec += DEC_GRID_STEP_DEG) {
      gridShape.moveTo(0, decToY(dec)).lineTo(width, decToY(dec));
    }
    const gridPath = new Path(gridShape, {
      stroke: BasicCoordinatesAndSeasonsColors.gridColorProperty,
      lineWidth: 0.5,
      opacity: 0.7,
    });

    // Tick labels: RA along the top, Dec along the left edge.
    const tickFont = new PhetFont(CONTROL_FONT_SIZE - 2);
    const tickLabels = new Node();
    for (let ra = 0; ra < 24; ra += RA_GRID_STEP_HOURS) {
      const label = new Text(`${ra}ʰ`, { font: tickFont, fill: BasicCoordinatesAndSeasonsColors.textColorProperty });
      label.centerX = raToX(ra);
      label.top = 2;
      tickLabels.addChild(label);
    }
    for (let dec = -60; dec <= 60; dec += DEC_GRID_STEP_DEG) {
      const label = new Text(`${dec}°`, { font: tickFont, fill: BasicCoordinatesAndSeasonsColors.textColorProperty });
      label.left = 2;
      label.centerY = decToY(dec);
      tickLabels.addChild(label);
    }

    // Background stars from the bright-star catalog.
    const starShape = new Shape();
    for (let i = 0; i < BRIGHT_STAR_COUNT; i++) {
      const ra = BRIGHT_STAR_RA_HOURS[i];
      const dec = BRIGHT_STAR_DEC_DEG[i];
      const mag = BRIGHT_STAR_MAG[i];
      if (ra !== undefined && dec !== undefined && mag !== undefined) {
        starShape.circle(raToX(ra), decToY(dec), magToRadius(mag));
      }
    }
    const starPath = new Path(starShape, {
      fill: BasicCoordinatesAndSeasonsColors.starColorProperty,
    });

    // Zodiac constellation stick figures.
    const zodiacShape = new Shape();
    const zodiacDots = new Shape();
    for (const constellation of ZODIAC_CONSTELLATIONS) {
      for (const star of constellation.stars) {
        zodiacDots.circle(raToX(star.raHours), decToY(star.decDeg), 1.4);
      }
      for (const [i, j] of constellation.edges) {
        const a = constellation.stars[i];
        const b = constellation.stars[j];
        if (a && b) {
          zodiacShape.moveTo(raToX(a.raHours), decToY(a.decDeg)).lineTo(raToX(b.raHours), decToY(b.decDeg));
        }
      }
    }
    const zodiacNode = new Node({
      children: [
        new Path(zodiacShape, {
          stroke: BasicCoordinatesAndSeasonsColors.starColorProperty,
          lineWidth: 0.75,
          opacity: 0.7,
        }),
        new Path(zodiacDots, { fill: BasicCoordinatesAndSeasonsColors.starColorProperty }),
      ],
    });
    constellationsVisibleProperty.link((visible) => {
      zodiacNode.visible = visible;
    });

    const content = new Node({
      children: [gridPath, starPath, zodiacNode],
      clipArea: Shape.rect(0, 0, width, height),
    });

    // Draggable star marker.
    const starDot = new Path(createStarShape(STAR_RADIUS), {
      fill: BasicCoordinatesAndSeasonsColors.selectedStarColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      lineWidth: 1,
      cursor: "pointer",
      tagName: "div",
      focusable: true,
      accessibleName: options.accessibleName,
      ...(options.accessibleHelpText && { accessibleHelpText: options.accessibleHelpText }),
    });

    super({ children: [border, content, tickLabels, starDot] });

    starDot.addInputListener(
      new DragListener({
        drag: (event) => {
          const local = this.globalToLocalPoint(event.pointer.point);
          raProperty.value = normalizeHours(xToRa(Math.max(0, Math.min(width, local.x))));
          decProperty.value = Math.max(-90, Math.min(90, yToDec(Math.max(0, Math.min(height, local.y)))));
        },
      }),
    );

    starDot.addInputListener(
      new KeyboardListener({
        keys: [...BasicCoordinatesAndSeasonsHotkeyData.ARROW_KEYS],
        fireOnHold: true,
        fire: (_event, keysPressed) => {
          switch (keysPressed) {
            case "arrowLeft":
              raProperty.value = normalizeHours(raProperty.value + RA_STEP_HOURS); // left = increasing RA
              break;
            case "arrowRight":
              raProperty.value = normalizeHours(raProperty.value - RA_STEP_HOURS);
              break;
            case "arrowUp":
              decProperty.value = Math.min(90, decProperty.value + DEC_STEP_DEG);
              break;
            case "arrowDown":
              decProperty.value = Math.max(-90, decProperty.value - DEC_STEP_DEG);
              break;
            default:
              break;
          }
        },
      }),
    );

    Multilink.multilink([raProperty, decProperty], (ra, dec) => {
      starDot.center = new Vector2(raToX(ra), decToY(dec));
    });
  }
}
