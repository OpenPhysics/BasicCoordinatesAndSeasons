/**
 * FlatEarthMapNode.ts
 *
 * A flat (equirectangular) map of the Earth with a draggable observer cursor and
 * seamless horizontal panning. Dragging the cursor — or typing/arrow-keying — sets
 * the observer's latitude and longitude. Dragging the map background (or the pan
 * buttons in the screen view) scrolls the map east/west; the geography wraps around
 * the ±180° seam with no gap.
 *
 * Panning is done by rendering the geographically-anchored world (land, graticule,
 * equator, and any caller-supplied overlay) three times, tiled at x ∈ {−width, 0,
 * +width}, inside a clipped viewport. The tile container is shifted by the pan offset
 * so at least one copy always covers every screen column — the standard infinite-scroll
 * trick. The observer cursor is a single node positioned at the (mod-width) screen
 * column for its longitude; it is not tiled because a point marker only ever needs one
 * on-screen position.
 *
 * The frame is drawn outside the geography: a checkered neatline hugs the edges, the
 * meridian (longitude) labels pan in a clipped strip above the top edge, and the
 * latitude labels sit fixed just outside the left edge.
 */

import { Multilink, type NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, DragListener, KeyboardListener, Line, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import {
  type EarthMapResolution,
  LATITUDE_RANGE,
  LOCATION_STEP_DEGREES,
} from "../../BasicCoordinatesAndSeasonsConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import BasicCoordinatesAndSeasonsHotkeyData from "../BasicCoordinatesAndSeasonsHotkeyData.js";
import { type EarthShorePoint, getEarthShorePolygons } from "../model/EarthShoreData.js";
import { CheckeredBorderNode } from "./CheckeredBorderNode.js";
import { CoordinateIndicatorNode } from "./CoordinateIndicatorNode.js";

/** Canonical (pan-free) map coordinate helpers passed to overlay factories. */
export type FlatMapWorldContext = {
  readonly width: number;
  readonly height: number;
  /** Longitude (°, +E) → x in [0, width], with −180° at x=0 and +180° at x=width. */
  readonly lonToX: (lon: number) => number;
  /** Latitude (°, +N) → y in [0, height], with +90° at y=0. */
  readonly latToY: (lat: number) => number;
};

export type FlatEarthMapNodeOptions = {
  width: number;
  height: number;
  /**
   * Optional geographically-anchored overlay (e.g. cities, the date line). Called
   * once per tile so its content pans and wraps with the map; each call must return
   * a fresh Node.
   */
  overlayFactory?: (context: FlatMapWorldContext) => Node;
  /**
   * Optional colored coordinate indicator: a full-width latitude line and a
   * full-height longitude line drawn through the observer cursor, each carrying a
   * numerical value label at the map edge. Matches the NAAP mapExplorer
   * `moveCursor` longitude/latitude indicator lines. When omitted, no indicator
   * is drawn.
   */
  coordinateIndicator?: {
    longitudeLabelProperty: TReadOnlyProperty<string>;
    latitudeLabelProperty: TReadOnlyProperty<string>;
  };
};

type GeoPoint = { lon: number; lat: number };

const shorePointToGeo = (point: EarthShorePoint): GeoPoint => ({
  lon: Math.atan2(point.y, point.x) * (180 / Math.PI),
  lat: Math.asin(point.z) * (180 / Math.PI),
});

/** Positive modulo (result always in [0, n)). */
const mod = (value: number, n: number): number => ((value % n) + n) % n;

/** True when the short map edge between two lon/lats crosses the antimeridian. */
const crossesDateline = (from: GeoPoint, to: GeoPoint): boolean => Math.abs(to.lon - from.lon) > 180;

/** Degrees traveled eastward from `from` to `to` (mod 360). */
const eastwardArc = (from: GeoPoint, to: GeoPoint): number => (to.lon - from.lon + 360) % 360;

/** Standard shore polygons: split at the dateline so each subpath closes locally. */
const addSplitShorePolygonToShape = (
  shape: Shape,
  polygon: readonly EarthShorePoint[],
  lonToX: (lon: number) => number,
  latToY: (lat: number) => number,
): void => {
  let previousLon: number | null = null;
  let penDown = false;

  for (const point of polygon) {
    const { lon, lat } = shorePointToGeo(point);
    if (previousLon !== null && Math.abs(lon - previousLon) > 180) {
      if (penDown) {
        shape.close();
      }
      penDown = false;
    }
    if (penDown) {
      shape.lineTo(lonToX(lon), latToY(lat));
    } else {
      shape.moveTo(lonToX(lon), latToY(lat));
      penDown = true;
    }
    previousLon = lon;
  }

  if (penDown) {
    shape.close();
  }
};

/**
 * Southern-cap shore polygons (Antarctica): keep one continuous path, route dateline
 * crossings through the south-pole map edge, and close along the bottom.
 */
const addSouthCapShorePolygonToShape = (
  shape: Shape,
  polygon: readonly EarthShorePoint[],
  lonToX: (lon: number) => number,
  latToY: (lat: number) => number,
  width: number,
  height: number,
): void => {
  const points = polygon.map(shorePointToGeo);
  const first = points[0];
  if (!first) {
    return; // empty polygon: nothing to stroke/fill
  }

  const appendSouthCapEdge = (from: GeoPoint, to: GeoPoint): void => {
    if (crossesDateline(from, to)) {
      const westward = eastwardArc(from, to) > 180;
      const exitEdgeX = westward ? 0 : width;
      shape.lineTo(exitEdgeX, latToY(from.lat));
      shape.lineTo(exitEdgeX, height);
      // Stop at the target longitude — not the far map edge — so the closing
      // edge does not retrace this bottom segment and leave a fill notch.
      shape.lineTo(lonToX(to.lon), height);
    }
    shape.lineTo(lonToX(to.lon), latToY(to.lat));
  };

  shape.moveTo(lonToX(first.lon), latToY(first.lat));
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    if (from && to) {
      appendSouthCapEdge(from, to);
    }
  }

  // Close directly between adjacent coast points; the dateline edge already
  // traced the south-pole map edge, so routing the close through the bottom
  // again would retrace that segment backwards and leave a fill notch.
  shape.close();
};

/** Add one land shore polygon to the flat map shape. */
const addShorePolygonToShape = (
  shape: Shape,
  polygon: readonly EarthShorePoint[],
  lonToX: (lon: number) => number,
  latToY: (lat: number) => number,
  width: number,
  height: number,
): void => {
  if (polygon.length === 0) {
    return;
  }

  const minLat = Math.min(...polygon.map((point) => shorePointToGeo(point).lat));
  if (minLat < -60) {
    addSouthCapShorePolygonToShape(shape, polygon, lonToX, latToY, width, height);
  } else {
    addSplitShorePolygonToShape(shape, polygon, lonToX, latToY);
  }
};

const buildLandShape = (
  resolution: EarthMapResolution,
  lonToX: (lon: number) => number,
  latToY: (lat: number) => number,
  width: number,
  height: number,
): Shape => {
  const land = new Shape();
  for (const polygon of getEarthShorePolygons(resolution)) {
    addShorePolygonToShape(land, polygon, lonToX, latToY, width, height);
  }
  return land;
};

/** The label for a meridian multiple of 45°, e.g. `0°`, `180°`, `90° W`, `45° E`. */
const meridianLabel = (longitude: number): string => {
  const value = mod(longitude, 360);
  if (value === 0) {
    return "0°";
  }
  if (value === 180) {
    return "180°";
  }
  return value > 180 ? `${360 - value}° W` : `${value}° E`;
};

/** Thickness (px) of the checkered neatline. */
const BORDER_THICKNESS = 7;
/** Gap (px) between the map edge and the coordinate number labels sitting outside it. */
const LABEL_GAP = 3;
/** Height (px) of the clipped strip above the map that holds the panning meridian labels. */
const TOP_LABEL_STRIP = 16;
/** Checker cells: 8 across (every 45°) and 6 down (every 30°). */
const BORDER_SEGMENTS_X = 8;
const BORDER_SEGMENTS_Y = 6;

export class FlatEarthMapNode extends Node {
  public constructor(
    latitudeProperty: NumberProperty,
    longitudeProperty: NumberProperty,
    earthMapResolutionProperty: TReadOnlyProperty<EarthMapResolution>,
    longitudeOffsetProperty: NumberProperty,
    options: FlatEarthMapNodeOptions,
  ) {
    const { width, height, overlayFactory, coordinateIndicator } = options;
    const controls = StringManager.getInstance().getControls();

    const lonToX = (lon: number): number => ((lon + 180) / 360) * width;
    const latToY = (lat: number): number => ((90 - lat) / 180) * height;
    const worldContext: FlatMapWorldContext = { width, height, lonToX, latToY };

    // Static ocean backdrop (uniform, so no need to tile it).
    const oceanRect = new Rectangle(0, 0, width, height, {
      fill: BasicCoordinatesAndSeasonsColors.earthOceanColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.sphereOutlineColorProperty,
      lineWidth: 1,
    });

    // One tile of the geographically-anchored world. Built three times and tiled
    // horizontally so panning wraps seamlessly. Land Shapes are immutable data, so
    // they are shared across tiles; the mutable Path handle is collected for
    // resolution updates.
    const landPaths: Path[] = [];
    const labelFont = new PhetFont(9);

    const createWorldTile = (): Node => {
      const landPath = new Path(buildLandShape(earthMapResolutionProperty.value, lonToX, latToY, width, height), {
        fill: BasicCoordinatesAndSeasonsColors.earthLandColorProperty,
        stroke: BasicCoordinatesAndSeasonsColors.sphereOutlineColorProperty,
        lineWidth: 0.35,
        opacity: 0.95,
      });
      landPaths.push(landPath);

      // Graticule: parallels every 30°, meridians every 60°.
      const grid = new Shape();
      for (let lat = -60; lat <= 60; lat += 30) {
        grid.moveTo(0, latToY(lat)).lineTo(width, latToY(lat));
      }
      for (let lon = -120; lon <= 120; lon += 60) {
        grid.moveTo(lonToX(lon), 0).lineTo(lonToX(lon), height);
      }
      const gridPath = new Path(grid, {
        stroke: BasicCoordinatesAndSeasonsColors.gridColorProperty,
        lineWidth: 0.5,
        opacity: 0.7,
      });

      const equatorLine = new Line(0, latToY(0), width, latToY(0), {
        stroke: BasicCoordinatesAndSeasonsColors.celestialEquatorColorProperty,
        lineWidth: 1,
      });

      const children: Node[] = [landPath, gridPath, equatorLine];
      if (overlayFactory) {
        children.push(overlayFactory(worldContext));
      }
      return new Node({ children });
    };

    // Three tiles at −width, 0, +width. The container is shifted by the pan offset,
    // inside a stationary clipped viewport so the wrap stays invisible.
    const tiles = new Node({
      children: [-width, 0, width].map((offsetX) => {
        const tile = createWorldTile();
        tile.x = offsetX;
        return tile;
      }),
    });
    const tilesViewport = new Node({ children: [tiles], clipArea: Shape.rect(0, 0, width, height) });

    // Meridian labels live just ABOVE the top edge (outside the map) and pan with the
    // content; tiled and clipped to a strip so copies never spill past the map width.
    const createTopLabelTile = (): Node => {
      const node = new Node({ pickable: false });
      for (let lon = -180; lon < 180; lon += 45) {
        node.addChild(
          new Text(meridianLabel(lon), {
            font: labelFont,
            fill: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
            centerX: lonToX(lon),
            bottom: -LABEL_GAP,
          }),
        );
      }
      return node;
    };
    const topLabelTiles = new Node({
      children: [-width, 0, width].map((offsetX) => {
        const tile = createTopLabelTile();
        tile.x = offsetX;
        return tile;
      }),
    });
    const topLabelStrip = new Node({
      children: [topLabelTiles],
      pickable: false,
      clipArea: Shape.rect(0, -TOP_LABEL_STRIP, width, TOP_LABEL_STRIP),
    });

    // Latitude labels sit just outside the left edge; parallels are horizontal so
    // these never pan.
    const latitudeLabels = new Node({ pickable: false });
    for (let lat = -60; lat <= 60; lat += 30) {
      latitudeLabels.addChild(
        new Text(`${Math.abs(lat)}°${lat > 0 ? "N" : lat < 0 ? "S" : ""}`, {
          font: labelFont,
          fill: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
          right: -LABEL_GAP,
          centerY: latToY(lat),
        }),
      );
    }

    // Alternating black/white cartographic neatline, cells sized to the grid
    // (45° across, 30° down).
    const checkeredBorder = new CheckeredBorderNode(width, height, {
      thickness: BORDER_THICKNESS,
      segmentsX: BORDER_SEGMENTS_X,
      segmentsY: BORDER_SEGMENTS_Y,
    });

    // Transparent full-map input catcher for drag-to-pan. Sits above the geography
    // but below the cursor, so pressing anywhere except the crosshair pans the map.
    const panTarget = new Rectangle(0, 0, width, height, { fill: "rgba(0,0,0,0)", cursor: "grab" });

    // Observer cursor: crosshair + dot. A single node (a point marker only needs one
    // on-screen position); the transparent disk enlarges the thin-armed grab target.
    const cursor = new Node({
      cursor: "grab",
      children: [
        new Circle(12, { fill: "rgba(0,0,0,0)" }),
        new Line(-10, 0, 10, 0, { stroke: BasicCoordinatesAndSeasonsColors.observerColorProperty, lineWidth: 1.5 }),
        new Line(0, -10, 0, 10, { stroke: BasicCoordinatesAndSeasonsColors.observerColorProperty, lineWidth: 1.5 }),
        new Circle(4, { fill: BasicCoordinatesAndSeasonsColors.observerColorProperty }),
      ],
    });

    // ── Coordinate indicator (optional) ─────────────────────────────────────────
    // Variable-length segments whose length encodes the value, like NAAP's
    // mapExplorer `moveCursor`: a longitude segment along the equator from Greenwich
    // and a latitude segment along the observer's meridian. Shared with the sky map.
    const indicator = coordinateIndicator
      ? new CoordinateIndicatorNode({
          width,
          height,
          horizontalLabelProperty: coordinateIndicator.longitudeLabelProperty,
          verticalLabelProperty: coordinateIndicator.latitudeLabelProperty,
          horizontalColorProperty: BasicCoordinatesAndSeasonsColors.longitudeIndicatorColorProperty,
          verticalColorProperty: BasicCoordinatesAndSeasonsColors.latitudeIndicatorColorProperty,
        })
      : null;
    // The indicator is tiled across the ±width seam, so clip it to the map face.
    const indicatorLayer = indicator
      ? new Node({ children: [indicator], clipArea: Shape.rect(0, 0, width, height) })
      : new Node();

    super({
      // Only the panning geography and the indicator are clipped to the map face;
      // the neatline and the coordinate labels sit outside the frame and are not.
      children: [
        oceanRect,
        tilesViewport,
        panTarget,
        checkeredBorder,
        topLabelStrip,
        latitudeLabels,
        indicatorLayer,
        cursor,
      ],
      tagName: "div",
      focusable: true,
      accessibleName: controls.observerLocationStringProperty,
    });

    // Screen column (in [0, width)) where a given longitude currently appears.
    let pixelShift = 0;
    const updatePan = (): void => {
      pixelShift = mod(lonToX(longitudeOffsetProperty.value) - width / 2, width);
      tiles.x = -pixelShift;
      topLabelTiles.x = -pixelShift;
    };
    const updateCursor = (): void => {
      const markerScreenX = mod(lonToX(longitudeProperty.value) - pixelShift, width);
      const markerY = latToY(latitudeProperty.value);
      cursor.translation = new Vector2(markerScreenX, markerY);
      // Longitude indicator: equatorial segment from Greenwich (0°) by the signed
      // longitude, so its length encodes how far east/west of Greenwich the observer is.
      indicator?.update({
        equatorY: latToY(0),
        referenceScreenX: mod(lonToX(0) - pixelShift, width),
        horizontalDeltaX: (longitudeProperty.value / 360) * width,
        markerScreenX,
        markerY,
      });
    };

    longitudeOffsetProperty.link(() => {
      updatePan();
      updateCursor();
    });
    Multilink.multilink([latitudeProperty, longitudeProperty], updateCursor);

    earthMapResolutionProperty.link((resolution) => {
      const shape = buildLandShape(resolution, lonToX, latToY, width, height);
      for (const landPath of landPaths) {
        landPath.shape = shape;
      }
    });

    // Cursor drag → observer lat/long. Converts the pointer's viewport position back
    // through the current pan, wrapping longitude into [−180, 180).
    const setObserverFromLocalPoint = (localX: number, localY: number): void => {
      const worldX = mod(localX + pixelShift, width);
      longitudeProperty.value = (worldX / width) * 360 - 180;
      latitudeProperty.value = LATITUDE_RANGE.constrainValue(90 - (localY / height) * 180);
    };
    cursor.addInputListener(
      new DragListener({
        drag: (event) => {
          const local = this.globalToLocalPoint(event.pointer.point);
          setObserverFromLocalPoint(local.x, local.y);
        },
      }),
    );

    // Background drag → pan. 360° spans the full map width.
    let panStartOffset = 0;
    let panStartLocalX = 0;
    panTarget.addInputListener(
      new DragListener({
        start: (event) => {
          panStartOffset = longitudeOffsetProperty.value;
          panStartLocalX = this.globalToLocalPoint(event.pointer.point).x;
        },
        drag: (event) => {
          const localX = this.globalToLocalPoint(event.pointer.point).x;
          longitudeOffsetProperty.value = panStartOffset - ((localX - panStartLocalX) / width) * 360;
        },
      }),
    );

    // Arrow keys nudge the observer in 5° steps; left/right wrap longitude.
    this.addInputListener(
      new KeyboardListener({
        keys: [...BasicCoordinatesAndSeasonsHotkeyData.ARROW_KEYS],
        fireOnHold: true,
        fire: (_event, keysPressed) => {
          if (keysPressed === "arrowLeft") {
            longitudeProperty.value = mod(longitudeProperty.value - LOCATION_STEP_DEGREES + 180, 360) - 180;
          } else if (keysPressed === "arrowRight") {
            longitudeProperty.value = mod(longitudeProperty.value + LOCATION_STEP_DEGREES + 180, 360) - 180;
          } else if (keysPressed === "arrowUp") {
            latitudeProperty.value = LATITUDE_RANGE.constrainValue(latitudeProperty.value + LOCATION_STEP_DEGREES);
          } else if (keysPressed === "arrowDown") {
            latitudeProperty.value = LATITUDE_RANGE.constrainValue(latitudeProperty.value - LOCATION_STEP_DEGREES);
          }
        },
      }),
    );
  }
}
