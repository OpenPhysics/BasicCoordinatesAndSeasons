/**
 * EarthFromSunNode.ts
 *
 * The Earth close-up seen looking straight down the Sun→Earth line (NAAP's "view
 * from Sun"): a textured globe whose sub-solar point sits dead centre (the whole
 * visible hemisphere is day, so there is no terminator). The rotation axis leans
 * by the Sun's declination δ☉, opening the latitude circles (equator, tropics,
 * polar circles) into ellipses. A red latitude circle marks the observer's
 * latitude φ and is draggable / arrow-key nudgeable to change it; the Sun sits at
 * the centre as the subsolar point.
 *
 * The view reuses the shared orthographic {@link SkyProjection}. Its camera is
 * driven from the Sun's position so that the subsolar direction (RA = α☉, Dec =
 * δ☉) always projects to screen centre facing the viewer, with the north
 * celestial pole straight up. The geography is anchored in the RA frame, so the
 * globe appears to turn as the date (and hence α☉) advances.
 */

import { Multilink, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, DragListener, KeyboardListener, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import {
  DEFAULT_EARTH_MAP_RESOLUTION,
  LATITUDE_RANGE,
  LOCATION_STEP_DEGREES,
  OBLIQUITY_DEGREES,
} from "../../BasicCoordinatesAndSeasonsConstants.js";
import BasicCoordinatesAndSeasonsHotkeyData from "../../common/BasicCoordinatesAndSeasonsHotkeyData.js";
import { type EarthShorePoint, getEarthShorePolygons } from "../../common/model/EarthShoreData.js";
import { degToRad, radToDeg } from "../../common/SkyCoordinates.js";
import { SkyProjection } from "../../common/SkyProjection.js";
import {
  addFrontHemisphereSmoothPolyline,
  addFrontHemisphereSphericalPolygon,
  smallCirclePoints,
} from "../../common/view/skyGraphics.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { SeasonsModel } from "../model/SeasonsModel.js";

export type EarthFromSunNodeOptions = {
  radius: number;
  accessibleName: TReadOnlyProperty<string>;
  accessibleHelpText?: TReadOnlyProperty<string>;
};

const NCP = new Vector3(0, 0, 1);
const polarCircleLat = 90 - OBLIQUITY_DEGREES;
// Reference small-circles drawn on the globe, with the latitude of each.
const REFERENCE_LATITUDES = [0, OBLIQUITY_DEGREES, -OBLIQUITY_DEGREES, polarCircleLat, -polarCircleLat];

const clampLatitude = (lat: number): number => Math.max(LATITUDE_RANGE.min, Math.min(LATITUDE_RANGE.max, lat));

/** Converts a unit shore-data point (earth-fixed) into an RA-frame direction. */
const shorePointToVector = (point: EarthShorePoint): Vector3 => {
  const lonHours = (Math.atan2(point.y, point.x) / (2 * Math.PI)) * 24;
  const latDeg = radToDeg(Math.asin(point.z));
  const raRad = (lonHours / 24) * 2 * Math.PI;
  const cosLat = Math.cos(degToRad(latDeg));
  return new Vector3(cosLat * Math.cos(raRad), cosLat * Math.sin(raRad), Math.sin(degToRad(latDeg)));
};

export class EarthFromSunNode extends Node {
  public constructor(model: SeasonsModel, options: EarthFromSunNodeOptions) {
    const r = options.radius;
    const controls = StringManager.getInstance().getControls();
    const projection = new SkyProjection({ center: Vector2.ZERO, radius: r });

    const disc = new Circle(r, {
      fill: BasicCoordinatesAndSeasonsColors.earthOceanColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      lineWidth: 1,
    });
    const landPath = new Path(null, {
      fill: BasicCoordinatesAndSeasonsColors.earthLandColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.sphereOutlineColorProperty,
      lineWidth: 0.35,
      opacity: 0.95,
    });
    const gridPath = new Path(null, {
      stroke: BasicCoordinatesAndSeasonsColors.seasonsEclipticColorProperty,
      lineWidth: 1,
      opacity: 0.7,
    });
    // Observer's parallel: a red latitude circle, draggable to change the latitude.
    const latitudeCircle = new Path(null, {
      stroke: "#ff4d4d",
      lineWidth: 2.5,
      cursor: "pointer",
      tagName: "div",
      focusable: true,
      accessibleName: options.accessibleName,
      ...(options.accessibleHelpText && { accessibleHelpText: options.accessibleHelpText }),
    });
    const subsolarDot = new Circle(4, {
      fill: BasicCoordinatesAndSeasonsColors.sunColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      lineWidth: 0.5,
    });

    // Reference-circle labels (equator, tropics, polar circles, poles), toggled.
    const labelFont = new PhetFont(9);
    const labelColor = BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty;
    const makeLabel = (property: TReadOnlyProperty<string>): Text =>
      new Text(property, { font: labelFont, fill: labelColor, maxWidth: 90 });
    const circleLabels: { label: Text; lat: number }[] = [
      { label: makeLabel(controls.equatorStringProperty), lat: 0 },
      { label: makeLabel(controls.tropicOfCancerStringProperty), lat: OBLIQUITY_DEGREES },
      { label: makeLabel(controls.tropicOfCapricornStringProperty), lat: -OBLIQUITY_DEGREES },
      { label: makeLabel(controls.arcticCircleStringProperty), lat: polarCircleLat },
      { label: makeLabel(controls.antarcticCircleStringProperty), lat: -polarCircleLat },
    ];
    const poleLabels: { label: Text; lat: number }[] = [
      { label: makeLabel(controls.northPoleStringProperty), lat: 90 },
      { label: makeLabel(controls.southPoleStringProperty), lat: -90 },
    ];
    const labelsLayer = new Node({ children: [...circleLabels, ...poleLabels].map((c) => c.label) });
    model.earthLabelsVisibleProperty.link((visible) => {
      labelsLayer.visible = visible;
    });

    const clip = Shape.circle(0, 0, r);
    landPath.clipArea = clip;
    gridPath.clipArea = clip;
    latitudeCircle.clipArea = clip;

    super({ children: [disc, landPath, gridPath, latitudeCircle, subsolarDot, labelsLayer] });

    const project = (v: Vector3): Vector2 => projection.project(v);
    const resolution = new Property(DEFAULT_EARTH_MAP_RESOLUTION);

    // Drive the camera so the subsolar point (RA α☉, Dec δ☉) faces the viewer at
    // screen centre with the NCP up: azimuth spins RA α☉ to front, elevation −δ☉
    // tips the pole. Both feed viewMatrixProperty, so the draw multilink below
    // refires whenever the Sun (and hence the date) moves.
    Multilink.multilink([model.sunRightAscensionProperty, model.sunDeclinationProperty], (raHours, decDeg) => {
      const raRad = (raHours / 24) * 2 * Math.PI;
      const cosDec = Math.cos(degToRad(decDeg));
      const sx = cosDec * Math.cos(raRad);
      const sy = cosDec * Math.sin(raRad);
      projection.azimuthProperty.value = Math.atan2(sx, sy);
      projection.elevationProperty.value = -degToRad(decDeg);
    });

    /** Places a label at the most front-facing point of a constant-latitude circle. */
    const placeOnCircle = (label: Text, lat: number): void => {
      let best: Vector2 | null = null;
      let bestDepth = 0;
      for (const v of smallCirclePoints(NCP, 90 - lat)) {
        const { point, depth } = projection.projectWithDepth(v);
        if (depth > bestDepth) {
          bestDepth = depth;
          best = point;
        }
      }
      label.visible = best !== null;
      if (best) {
        label.center = best;
      }
    };

    Multilink.multilink(
      [projection.viewMatrixProperty, model.latitudeProperty, model.subsolarPointVisibleProperty],
      (_matrix, latitude, subsolarVisible) => {
        // Land: front-hemisphere coastline fills, clipped to the disc.
        const landShape = new Shape();
        for (const polygon of getEarthShorePolygons(resolution.value)) {
          const vertices = polygon.map(shorePointToVector);
          addFrontHemisphereSphericalPolygon(projection, vertices, landShape, project, Vector2.ZERO, r);
        }
        landPath.shape = landShape;

        // Reference latitude circles (equator, tropics, polar circles).
        const gridShape = new Shape();
        for (const lat of REFERENCE_LATITUDES) {
          addFrontHemisphereSmoothPolyline(projection, smallCirclePoints(NCP, 90 - lat), gridShape, project, true);
        }
        gridPath.shape = gridShape;

        // Observer's red latitude circle at φ.
        const latShape = new Shape();
        addFrontHemisphereSmoothPolyline(projection, smallCirclePoints(NCP, 90 - latitude), latShape, project, true);
        latitudeCircle.shape = latShape;

        // Subsolar point at the centre (the Sun is directly overhead there).
        subsolarDot.center = Vector2.ZERO;
        subsolarDot.visible = subsolarVisible;

        for (const { label, lat } of circleLabels) {
          placeOnCircle(label, lat);
        }
        for (const { label, lat } of poleLabels) {
          const { point, depth } = projection.projectWithDepth(lat > 0 ? NCP : NCP.negated());
          label.visible = depth > 0;
          label.center = point;
        }
      },
    );

    // Drag / arrow-keys set the latitude from the pointer's declination on the globe.
    const setLatitudeFromPoint = (globalPoint: Vector2): void => {
      const local = this.globalToLocalPoint(globalPoint);
      const v = projection.unproject(local);
      model.latitudeProperty.value = clampLatitude(radToDeg(Math.asin(Math.max(-1, Math.min(1, v.z)))));
    };
    latitudeCircle.addInputListener(new DragListener({ drag: (event) => setLatitudeFromPoint(event.pointer.point) }));
    latitudeCircle.addInputListener(
      new KeyboardListener({
        keys: [...BasicCoordinatesAndSeasonsHotkeyData.ARROW_KEYS],
        fireOnHold: true,
        fire: (_event, keysPressed) => {
          const current = model.latitudeProperty.value;
          if (keysPressed === "arrowUp" || keysPressed === "arrowRight") {
            model.latitudeProperty.value = clampLatitude(current + LOCATION_STEP_DEGREES);
          } else if (keysPressed === "arrowDown" || keysPressed === "arrowLeft") {
            model.latitudeProperty.value = clampLatitude(current - LOCATION_STEP_DEGREES);
          }
        },
      }),
    );
  }
}
