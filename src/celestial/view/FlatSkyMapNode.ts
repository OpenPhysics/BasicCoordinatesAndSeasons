/**
 * FlatSkyMapNode.ts
 *
 * A flat equatorial sky chart mapping right ascension (x) × declination (y),
 * following the standard star-chart convention: RA increases to the LEFT (0ʰ at
 * the right edge), Dec +90° at the top → −90° at the bottom. Shows a grid, axis
 * labels, great circles (ecliptic, galactic equator, celestial equator),
 * equinox/solstice markers, the zodiac constellation stick figures, and a
 * draggable star marker bound to the model's RA/Dec.
 *
 * Supports horizontal panning via the RA offset: the content wraps seamlessly.
 */

import { Multilink, type PhetioProperty, type Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { DragListener, KeyboardListener, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import type { CoordinateFormat } from "../../BasicCoordinatesAndSeasonsConstants.js";
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
const EC_STEPS = 120;

const ECLIPTIC_TILT_DEG = 23.4;
const GALACTIC_TILT_DEG = 62.6;
const ECLIPTIC_ASCENDING_NODE_RA = 0;
const GALACTIC_ASCENDING_NODE_RA = 167.75 / 15;

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
function toDeg(rad: number): number {
  return rad * (180 / Math.PI);
}

function eclipticDec(raHours: number): number {
  return toDeg(
    Math.asin(Math.sin(toRad(ECLIPTIC_TILT_DEG)) * Math.sin(toRad((raHours - ECLIPTIC_ASCENDING_NODE_RA) * 15))),
  );
}

function galacticDec(raHours: number): number {
  return toDeg(
    Math.asin(Math.sin(toRad(GALACTIC_TILT_DEG)) * Math.sin(toRad((raHours - GALACTIC_ASCENDING_NODE_RA) * 15))),
  );
}

function buildGreatCirclePath(
  raToX: (ra: number) => number,
  decToY: (dec: number) => number,
  decFn: (ra: number) => number,
): Shape {
  const shape = new Shape();
  for (let i = 0; i <= EC_STEPS; i++) {
    const ra = (24 * i) / EC_STEPS;
    const x = raToX(ra);
    const y = decToY(decFn(ra));
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  return shape;
}

export class FlatSkyMapNode extends Node {
  private readonly starDot: Path;

  public constructor(
    raProperty: PhetioProperty<number>,
    decProperty: PhetioProperty<number>,
    constellationsVisibleProperty: TReadOnlyProperty<boolean>,
    raOffsetProperty: Property<number>,
    celestialEquatorVisibleProperty: TReadOnlyProperty<boolean>,
    eclipticVisibleProperty: TReadOnlyProperty<boolean>,
    galacticEquatorVisibleProperty: TReadOnlyProperty<boolean>,
    equinoxesAndSolsticesVisibleProperty: TReadOnlyProperty<boolean>,
    coordinateFormatProperty: TReadOnlyProperty<CoordinateFormat>,
    options: FlatSkyMapNodeOptions,
  ) {
    super();

    const mapWidth = options.width;
    const mapHeight = options.height;

    const raToX = (raHours: number): number => (mapWidth * (24 - (raHours % 24))) / 24;
    const decToY = (decDeg: number): number => (mapHeight * (90 - decDeg)) / 180;
    const xToRa = (x: number): number => 24 - (24 * x) / mapWidth;
    const yToDec = (y: number): number => 90 - (180 * y) / mapHeight;

    const border = new Rectangle(0, 0, mapWidth, mapHeight, {
      fill: BasicCoordinatesAndSeasonsColors.panelBackgroundColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.sphereOutlineColorProperty,
      lineWidth: 1,
    });

    // ── Grid lines ────────────────────────────────────────────────────
    const gridShape = new Shape();
    for (let ra = 0; ra <= 24; ra += RA_GRID_STEP_HOURS) {
      gridShape.moveTo(raToX(ra), 0).lineTo(raToX(ra), mapHeight);
    }
    for (let dec = -90; dec <= 90; dec += DEC_GRID_STEP_DEG) {
      gridShape.moveTo(0, decToY(dec)).lineTo(mapWidth, decToY(dec));
    }
    const gridPath = new Path(gridShape, {
      stroke: BasicCoordinatesAndSeasonsColors.gridColorProperty,
      lineWidth: 0.5,
      opacity: 0.7,
    });

    // ── Tick labels ───────────────────────────────────────────────────
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

    // ── Background stars ──────────────────────────────────────────────
    const starShape = new Shape();
    for (let i = 0; i < BRIGHT_STAR_COUNT; i++) {
      const ra = BRIGHT_STAR_RA_HOURS[i];
      const dec = BRIGHT_STAR_DEC_DEG[i];
      const mag = BRIGHT_STAR_MAG[i];
      if (ra !== undefined && dec !== undefined && mag !== undefined) {
        starShape.circle(raToX(ra), decToY(dec), magToRadius(mag));
      }
    }
    const starPath = new Path(starShape, { fill: BasicCoordinatesAndSeasonsColors.starColorProperty });

    // ── Great circles ─────────────────────────────────────────────────
    const eqPath = new Path(new Shape().moveTo(0, decToY(0)).lineTo(mapWidth, decToY(0)), {
      stroke: BasicCoordinatesAndSeasonsColors.celestialEquatorColorProperty,
      lineWidth: 1,
    });
    const eclipticPath = new Path(buildGreatCirclePath(raToX, decToY, eclipticDec), {
      stroke: BasicCoordinatesAndSeasonsColors.eclipticColorProperty,
      lineWidth: 1,
      opacity: 0.8,
    });
    const galacticPath = new Path(buildGreatCirclePath(raToX, decToY, galacticDec), {
      stroke: BasicCoordinatesAndSeasonsColors.galacticEquatorColorProperty,
      lineWidth: 1,
      opacity: 0.8,
    });

    // ── Equinox / solstice markers ────────────────────────────────────
    const markerFont = new PhetFont(10);
    const markerColor = BasicCoordinatesAndSeasonsColors.textColorProperty;
    const markers: Array<{ ra: number; label: string }> = [
      { ra: 0, label: "VE" },
      { ra: 6, label: "SS" },
      { ra: 12, label: "AE" },
      { ra: 18, label: "WS" },
    ];
    const markerNodes = markers.map((m) => {
      const txt = new Text(m.label, { font: markerFont, fill: markerColor });
      txt.centerX = raToX(m.ra);
      txt.top = decToY(eclipticDec(m.ra)) + 2;
      return txt;
    });
    const markersNode = new Node({ children: markerNodes });

    // ── Zodiac constellations ─────────────────────────────────────────
    const zShape = new Shape();
    const zDots = new Shape();
    for (const constellation of ZODIAC_CONSTELLATIONS) {
      for (const star of constellation.stars) {
        zDots.circle(raToX(star.raHours), decToY(star.decDeg), 1.4);
      }
      for (const [i, j] of constellation.edges) {
        const a = constellation.stars[i];
        const b = constellation.stars[j];
        if (a && b) {
          zShape.moveTo(raToX(a.raHours), decToY(a.decDeg)).lineTo(raToX(b.raHours), decToY(b.decDeg));
        }
      }
    }
    const zodiacNode = new Node({
      children: [
        new Path(zShape, { stroke: BasicCoordinatesAndSeasonsColors.starColorProperty, lineWidth: 0.75, opacity: 0.7 }),
        new Path(zDots, { fill: BasicCoordinatesAndSeasonsColors.starColorProperty }),
      ],
    });

    // ── Cursor labels (RA/Dec readout on the map face) ────────────────
    const cursorFont = new PhetFont(11);
    const raLabelText = new Text("", {
      font: cursorFont,
      fill: BasicCoordinatesAndSeasonsColors.selectedStarColorProperty,
    });
    const decLabelText = new Text("", {
      font: cursorFont,
      fill: BasicCoordinatesAndSeasonsColors.selectedStarColorProperty,
    });

    // ── Single 24h content tile ───────────────────────────────────────
    const singleTile = new Node({
      children: [
        gridPath,
        starPath,
        eqPath,
        eclipticPath,
        galacticPath,
        markersNode,
        zodiacNode,
        raLabelText,
        decLabelText,
      ],
    });

    const contentTile = new Node({
      children: [singleTile],
      clipArea: Shape.rect(0, 0, mapWidth, mapHeight),
    });

    this.starDot = new Path(createStarShape(STAR_RADIUS), {
      fill: BasicCoordinatesAndSeasonsColors.selectedStarColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      lineWidth: 1,
      cursor: "pointer",
      tagName: "div",
      focusable: true,
      accessibleName: options.accessibleName,
      ...(options.accessibleHelpText && { accessibleHelpText: options.accessibleHelpText }),
    });

    this.addChild(border);
    this.addChild(contentTile);
    this.addChild(tickLabels);
    this.addChild(this.starDot);

    // ── Drag and keyboard interactions ────────────────────────────────
    this.starDot.addInputListener(
      new DragListener({
        drag: (event) => {
          const local = this.globalToLocalPoint(event.pointer.point);
          raProperty.value = normalizeHours(xToRa(Math.max(0, Math.min(mapWidth, local.x))));
          decProperty.value = Math.max(-90, Math.min(90, yToDec(Math.max(0, Math.min(mapHeight, local.y)))));
        },
      }),
    );

    this.starDot.addInputListener(
      new KeyboardListener({
        keys: [...BasicCoordinatesAndSeasonsHotkeyData.ARROW_KEYS],
        fireOnHold: true,
        fire: (_event, keysPressed) => {
          switch (keysPressed) {
            case "arrowLeft":
              raProperty.value = normalizeHours(raProperty.value + RA_STEP_HOURS);
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

    // ── Reactive updates ──────────────────────────────────────────────
    Multilink.multilink([raProperty, decProperty, raOffsetProperty, coordinateFormatProperty], (ra, dec, raOffset) => {
      const pxPerHour = mapWidth / 24;
      contentTile.x = -(raOffset * pxPerHour);
      tickLabels.x = -(raOffset * pxPerHour);

      // Update RA tick-label text for every 3rd tick.
      const raChildren = tickLabels.children.filter((c): c is Text => c instanceof Text && c.string.includes("ʰ"));
      for (let i = 0; i < raChildren.length; i++) {
        const child = raChildren[i];
        if (child) {
          const raTick = (((i * 3 + Math.ceil(raOffset / 3) * 3) % 24) + 24) % 24;
          child.string = `${raTick}ʰ`;
          child.centerX = raToX(raTick);
        }
      }

      // Position star dot.
      this.starDot.center = new Vector2(raToX(ra), decToY(dec));

      // Update cursor labels.
      const fmt = coordinateFormatProperty.value;
      if (fmt === "sexagesimal") {
        const raH = Math.floor(ra);
        const raM = Math.round((ra - raH) * 60);
        const decAbs = Math.abs(dec);
        const decD = Math.floor(decAbs);
        const decM = Math.round((decAbs - decD) * 60);
        raLabelText.string = `${raH}h ${raM}m`;
        decLabelText.string = `${dec >= 0 ? "+" : "-"}${decD}° ${decM}'`;
      } else {
        raLabelText.string = `${ra.toFixed(1)} h`;
        decLabelText.string = `${dec >= 0 ? "+" : ""}${dec.toFixed(1)}°`;
      }
      raLabelText.left = 4;
      raLabelText.bottom = mapHeight - 4;
      decLabelText.left = 4;
      decLabelText.bottom = raLabelText.top - 2;
    });

    // ── Visibility toggles ────────────────────────────────────────────
    constellationsVisibleProperty.link((visible) => {
      zodiacNode.visible = visible;
    });
    celestialEquatorVisibleProperty.link((visible) => {
      eqPath.visible = visible;
    });
    eclipticVisibleProperty.link((visible) => {
      eclipticPath.visible = visible;
    });
    galacticEquatorVisibleProperty.link((visible) => {
      galacticPath.visible = visible;
    });
    equinoxesAndSolsticesVisibleProperty.link((visible) => {
      markersNode.visible = visible;
    });
  }
}
