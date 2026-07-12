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
 * Supports seamless horizontal panning via the RA offset (the pan buttons in the
 * screen view). The RA-anchored world — grid, background stars, great circles,
 * markers, and zodiac — is rendered three times, tiled at x ∈ {−width, 0, +width}
 * inside a clipped viewport, and the tile container is shifted by the pan offset so
 * at least one copy always covers every column (the same infinite-scroll trick as
 * FlatEarthMapNode). The star marker is a single node placed at its (mod-width) RA
 * column, so it stays anchored to its coordinate and scrolls with the map.
 *
 * The frame is drawn outside the sky: a checkered neatline hugs the edges, the RA
 * hour labels pan in a clipped strip above the top edge, and the declination labels
 * sit fixed just outside the left edge. An α/δ coordinate indicator (shared with the
 * flat Earth map) marks the star's right ascension and declination with value pills.
 */

import {
  DerivedProperty,
  Multilink,
  type PhetioProperty,
  type Property,
  type TReadOnlyProperty,
} from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { DragListener, KeyboardListener, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import type { CoordinateFormat } from "../../BasicCoordinatesAndSeasonsConstants.js";
import { CONTROL_FONT_SIZE, STAR_RADIUS } from "../../BasicCoordinatesAndSeasonsConstants.js";
import BasicCoordinatesAndSeasonsHotkeyData from "../../common/BasicCoordinatesAndSeasonsHotkeyData.js";
import { normalizeHours } from "../../common/SkyCoordinates.js";
import { CheckeredBorderNode } from "../../common/view/CheckeredBorderNode.js";
import { CoordinateIndicatorNode } from "../../common/view/CoordinateIndicatorNode.js";
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
/** Thickness (px) of the checkered neatline. */
const BORDER_THICKNESS = 7;
/** Gap (px) between the map edge and the coordinate number labels sitting outside it. */
const LABEL_GAP = 3;
/** Height (px) of the clipped strip above the map that holds the panning hour labels. */
const TOP_LABEL_STRIP = 16;
/** Checker cells: 8 across (every 3ʰ = 45°) and 6 down (every 30°). */
const BORDER_SEGMENTS_X = 8;
const BORDER_SEGMENTS_Y = 6;

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
    const pxPerHour = mapWidth / 24;

    const raToX = (raHours: number): number => (mapWidth * (24 - (raHours % 24))) / 24;
    const decToY = (decDeg: number): number => (mapHeight * (90 - decDeg)) / 180;
    const xToRa = (x: number): number => 24 - (24 * x) / mapWidth;
    const yToDec = (y: number): number => 90 - (180 * y) / mapHeight;
    /** Positive modulo (result always in [0, n)). */
    const mod = (value: number, n: number): number => ((value % n) + n) % n;

    const border = new Rectangle(0, 0, mapWidth, mapHeight, {
      fill: BasicCoordinatesAndSeasonsColors.panelBackgroundColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.sphereOutlineColorProperty,
      lineWidth: 1,
    });

    const tickFont = new PhetFont(CONTROL_FONT_SIZE - 2);

    // ── Declination tick labels (just outside the left edge; never pan) ──
    const decTickLabels = new Node();
    for (let dec = -60; dec <= 60; dec += DEC_GRID_STEP_DEG) {
      const label = new Text(`${dec}°`, { font: tickFont, fill: BasicCoordinatesAndSeasonsColors.textColorProperty });
      label.right = -LABEL_GAP;
      label.centerY = decToY(dec);
      decTickLabels.addChild(label);
    }

    const markerFont = new PhetFont(10);
    const markerColor = BasicCoordinatesAndSeasonsColors.textColorProperty;
    const markers: Array<{ ra: number; label: string }> = [
      { ra: 0, label: "VE" },
      { ra: 6, label: "SS" },
      { ra: 12, label: "AE" },
      { ra: 18, label: "WS" },
    ];

    // Toggleable path/node handles collected across every tile so a single
    // visibility link can flip all three copies at once.
    const eqPaths: Path[] = [];
    const eclipticPaths: Path[] = [];
    const galacticPaths: Path[] = [];
    const markersNodes: Node[] = [];
    const zodiacNodes: Node[] = [];

    // One 24ʰ tile of RA-anchored content. Built three times and tiled
    // horizontally (at x ∈ {−width, 0, +width}) so panning wraps seamlessly,
    // exactly like FlatEarthMapNode.
    const createWorldTile = (): Node => {
      // ── Grid lines ──────────────────────────────────────────────────
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

      // ── Background stars ────────────────────────────────────────────
      const starShape = new Shape();
      for (let i = 0; i < BRIGHT_STAR_COUNT; i++) {
        const ra = BRIGHT_STAR_RA_HOURS[i];
        const dec = BRIGHT_STAR_DEC_DEG[i];
        const mag = BRIGHT_STAR_MAG[i];
        if (ra !== undefined && dec !== undefined && mag !== undefined) {
          starShape.circle(raToX(ra), decToY(dec), magToRadius(mag));
        }
      }
      const starPath = new Path(starShape, { fill: BasicCoordinatesAndSeasonsColors.starColorProperty, opacity: 0.6 });

      // ── Great circles ───────────────────────────────────────────────
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
      eqPaths.push(eqPath);
      eclipticPaths.push(eclipticPath);
      galacticPaths.push(galacticPath);

      // ── Equinox / solstice markers ──────────────────────────────────
      const markersNode = new Node({
        children: markers.map((m) => {
          const txt = new Text(m.label, { font: markerFont, fill: markerColor });
          txt.centerX = raToX(m.ra);
          txt.top = decToY(eclipticDec(m.ra)) + 2;
          return txt;
        }),
      });
      markersNodes.push(markersNode);

      // ── Zodiac constellations ───────────────────────────────────────
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
          new Path(zShape, {
            stroke: BasicCoordinatesAndSeasonsColors.starColorProperty,
            lineWidth: 0.75,
            opacity: 0.7,
          }),
          new Path(zDots, { fill: BasicCoordinatesAndSeasonsColors.starColorProperty }),
        ],
      });
      zodiacNodes.push(zodiacNode);

      return new Node({
        children: [gridPath, starPath, eqPath, eclipticPath, galacticPath, markersNode, zodiacNode],
      });
    };

    // RA hour labels live just ABOVE the top edge (outside the map) and pan with the
    // content. Tiled and clipped to a strip so copies never spill past the map width.
    const createTopLabelTile = (): Node => {
      const node = new Node();
      for (let ra = 0; ra < 24; ra += RA_GRID_STEP_HOURS) {
        const label = new Text(`${ra}ʰ`, { font: tickFont, fill: BasicCoordinatesAndSeasonsColors.textColorProperty });
        label.centerX = raToX(ra);
        label.bottom = -LABEL_GAP;
        node.addChild(label);
      }
      return node;
    };
    const topLabelTiles = new Node({
      children: [-mapWidth, 0, mapWidth].map((offsetX) => {
        const tile = createTopLabelTile();
        tile.x = offsetX;
        return tile;
      }),
    });
    const topLabelStrip = new Node({
      children: [topLabelTiles],
      clipArea: Shape.rect(0, -TOP_LABEL_STRIP, mapWidth, TOP_LABEL_STRIP),
    });

    // Three tiles at −width, 0, +width. The tile container is shifted by the pan
    // offset; a stationary clipped viewport keeps the wrap invisible.
    const tiles = new Node({
      children: [-mapWidth, 0, mapWidth].map((offsetX) => {
        const tile = createWorldTile();
        tile.x = offsetX;
        return tile;
      }),
    });
    const contentTile = new Node({
      children: [tiles],
      clipArea: Shape.rect(0, 0, mapWidth, mapHeight),
    });

    // ── Coordinate indicator (α along the equator from 0ʰ, δ along the star's
    //    meridian) with numeric value pills; shared with the flat Earth map. ──
    const raLabelProperty = new DerivedProperty([raProperty, coordinateFormatProperty], (ra, fmt) => {
      if (fmt === "sexagesimal") {
        const raH = Math.floor(ra);
        const raM = Math.round((ra - raH) * 60);
        return `α = ${raH}ʰ ${raM}ᵐ`;
      }
      return `α = ${ra.toFixed(1)} h`;
    });
    const decLabelProperty = new DerivedProperty([decProperty, coordinateFormatProperty], (dec, fmt) => {
      if (fmt === "sexagesimal") {
        const decAbs = Math.abs(dec);
        const decD = Math.floor(decAbs);
        const decM = Math.round((decAbs - decD) * 60);
        return `δ = ${dec >= 0 ? "+" : "-"}${decD}° ${decM}'`;
      }
      return `δ = ${dec >= 0 ? "+" : ""}${dec.toFixed(1)}°`;
    });
    const indicator = new CoordinateIndicatorNode({
      width: mapWidth,
      height: mapHeight,
      horizontalLabelProperty: raLabelProperty,
      verticalLabelProperty: decLabelProperty,
      horizontalColorProperty: BasicCoordinatesAndSeasonsColors.selectedStarColorProperty,
      verticalColorProperty: BasicCoordinatesAndSeasonsColors.selectedStarColorProperty,
    });

    // Alternating black/white cartographic neatline around the map edges, with
    // cells sized to the coordinate grid (3ʰ across, 30° down).
    const checkeredBorder = new CheckeredBorderNode(mapWidth, mapHeight, {
      thickness: BORDER_THICKNESS,
      segmentsX: BORDER_SEGMENTS_X,
      segmentsY: BORDER_SEGMENTS_Y,
    });

    // The indicator is tiled across the ±width seam, so clip it to the map face.
    const indicatorLayer = new Node({ children: [indicator], clipArea: Shape.rect(0, 0, mapWidth, mapHeight) });

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
    this.addChild(checkeredBorder);
    this.addChild(topLabelStrip);
    this.addChild(decTickLabels);
    this.addChild(indicatorLayer);
    this.addChild(this.starDot);

    // Screen column (in [0, width)) the tiled content is currently shifted by.
    let pixelShift = mod(raOffsetProperty.value * pxPerHour, mapWidth);

    // ── Drag and keyboard interactions ────────────────────────────────
    // Convert the pointer's viewport position back through the current pan, so
    // dragging tracks the star under the cursor regardless of how the map is panned.
    this.starDot.addInputListener(
      new DragListener({
        drag: (event) => {
          const local = this.globalToLocalPoint(event.pointer.point);
          const worldX = mod(Math.max(0, Math.min(mapWidth, local.x)) + pixelShift, mapWidth);
          raProperty.value = normalizeHours(xToRa(worldX));
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
      // Pan the tiled content by the offset, wrapping modulo the map width so at
      // least one tile always covers every screen column (seamless scroll). The
      // hour labels above the map pan with it so each label tracks its grid line.
      pixelShift = mod(raOffset * pxPerHour, mapWidth);
      tiles.x = -pixelShift;
      topLabelTiles.x = -pixelShift;

      // Position the star dot at its RA screen column, tracking the pan.
      const markerScreenX = mod(raToX(ra) - pixelShift, mapWidth);
      const markerY = decToY(dec);
      this.starDot.center = new Vector2(markerScreenX, markerY);

      // Drive the α/δ indicator: α runs along the equator from 0ʰ (right edge) to
      // the star's meridian; δ runs along that meridian from the equator to the star.
      indicator.update({
        equatorY: decToY(0),
        referenceScreenX: mod(raToX(0) - pixelShift, mapWidth),
        horizontalDeltaX: raToX(ra) - raToX(0),
        markerScreenX,
        markerY,
      });
    });

    // ── Visibility toggles (applied to all tiled copies) ──────────────
    constellationsVisibleProperty.link((visible) => {
      for (const node of zodiacNodes) {
        node.visible = visible;
      }
    });
    celestialEquatorVisibleProperty.link((visible) => {
      for (const path of eqPaths) {
        path.visible = visible;
      }
    });
    eclipticVisibleProperty.link((visible) => {
      for (const path of eclipticPaths) {
        path.visible = visible;
      }
    });
    galacticEquatorVisibleProperty.link((visible) => {
      for (const path of galacticPaths) {
        path.visible = visible;
      }
    });
    equinoxesAndSolsticesVisibleProperty.link((visible) => {
      for (const node of markersNodes) {
        node.visible = visible;
      }
    });
  }
}
