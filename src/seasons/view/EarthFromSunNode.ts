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
import { Matrix3, Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, DragListener, KeyboardListener, Line, Node, Path, Text } from "scenerystack/scenery";
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
import { degToRad, raDecToVector3, radToDeg } from "../../common/SkyCoordinates.js";
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
const SCP = new Vector3(0, 0, -1);
// The ecliptic (orbital) north pole, in the RA/Dec frame. Viewing from the Sun keeps
// this pole "up" on screen, so Earth's celestial axis leans left/right with the season.
const ECLIPTIC_POLE = raDecToVector3(18, 90 - OBLIQUITY_DEGREES);
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

    // Rotation axis (N red / S blue), always shown so the seasonal lean reads clearly.
    const northAxis = new Path(null, { stroke: "#ff5252", lineWidth: 2 });
    const southAxis = new Path(null, { stroke: "#5b8dd6", lineWidth: 2 });
    const axisLayer = new Node({ children: [southAxis, northAxis] });

    // Reference-circle labels stacked in a column to the LEFT of the globe, each with
    // a thin leader line out to its circle (equator/tropics/polar) or pole — matching
    // the NAAP layout. Toggled by the earth-view "labels" checkbox.
    const labelFont = new PhetFont(9);
    const labelColor = BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty;
    const makeLabel = (property: TReadOnlyProperty<string>): Text =>
      new Text(property, { font: labelFont, fill: labelColor, maxWidth: 88 });
    const makeLeader = (): Line => new Line(0, 0, 0, 0, { stroke: labelColor, lineWidth: 0.6, opacity: 0.8 });

    // pole: 0 = a constant-latitude circle; +1 / −1 = the north / south pole point.
    // slot: vertical position of the label in the left column, as a fraction of r.
    type LabelSpec = { label: Text; leader: Line; lat: number; pole: number; slot: number };
    const labelSpecs: LabelSpec[] = [
      { label: makeLabel(controls.northPoleStringProperty), pole: 1, lat: 90, slot: -0.98 },
      { label: makeLabel(controls.arcticCircleStringProperty), pole: 0, lat: polarCircleLat, slot: -0.68 },
      { label: makeLabel(controls.tropicOfCancerStringProperty), pole: 0, lat: OBLIQUITY_DEGREES, slot: -0.38 },
      { label: makeLabel(controls.equatorStringProperty), pole: 0, lat: 0, slot: -0.05 },
      { label: makeLabel(controls.tropicOfCapricornStringProperty), pole: 0, lat: -OBLIQUITY_DEGREES, slot: 0.28 },
      { label: makeLabel(controls.antarcticCircleStringProperty), pole: 0, lat: -polarCircleLat, slot: 0.58 },
      { label: makeLabel(controls.southPoleStringProperty), pole: -1, lat: -90, slot: 0.92 },
    ].map((s) => ({ ...s, leader: makeLeader() }));
    const labelsLayer = new Node({
      children: labelSpecs.flatMap((s) => [s.leader, s.label]),
    });
    model.earthLabelsVisibleProperty.link((visible) => {
      labelsLayer.visible = visible;
    });

    const clip = Shape.circle(0, 0, r);
    landPath.clipArea = clip;
    gridPath.clipArea = clip;
    latitudeCircle.clipArea = clip;

    super({ children: [disc, landPath, gridPath, latitudeCircle, axisLayer, subsolarDot, labelsLayer] });

    const project = (v: Vector3): Vector2 => projection.project(v);
    const resolution = new Property(DEFAULT_EARTH_MAP_RESOLUTION);

    // Drive the camera to look straight down the Sun→Earth line. The view frame is
    // built from three orthonormal RA/Dec-frame axes so that:
    //   • the Sun direction (RA α☉, Dec δ☉) maps to "toward viewer" → subsolar point
    //     projects to screen centre;
    //   • the ecliptic pole maps to "up" → it stays vertical, so Earth's celestial
    //     axis (the NCP) leans sideways by up to ε as the season advances — vertical
    //     at the solstices, leaning ±ε at the equinoxes, matching the NAAP Flash view.
    // (The previous version kept the NCP itself vertical, so the axis never leaned.)
    Multilink.multilink([model.sunRightAscensionProperty, model.sunDeclinationProperty], (raHours, decDeg) => {
      const sun = raDecToVector3(raHours, decDeg);
      const right = sun.cross(ECLIPTIC_POLE).normalized();
      projection.frameMatrixProperty.value = Matrix3.rowMajor(
        right.x,
        right.y,
        right.z,
        sun.x,
        sun.y,
        sun.z,
        ECLIPTIC_POLE.x,
        ECLIPTIC_POLE.y,
        ECLIPTIC_POLE.z,
      );
    });

    // Left-hand column x where the label text right-edges align, just clear of the globe.
    const labelColumnRight = -(r + 10);

    /** The left-most front-facing screen point of a constant-latitude circle (or null). */
    const leftmostFrontPoint = (lat: number): Vector2 | null => {
      let best: Vector2 | null = null;
      for (const v of smallCirclePoints(NCP, 90 - lat)) {
        const { point, depth } = projection.projectWithDepth(v);
        if (depth >= 0 && (best === null || point.x < best.x)) {
          best = point;
        }
      }
      return best;
    };

    /** Positions one label in the left column with a leader out to `target` (or hides it). */
    const placeLabel = (spec: LabelSpec, target: Vector2 | null): void => {
      const visible = target !== null;
      spec.label.visible = visible;
      spec.leader.visible = visible;
      if (!target) {
        return;
      }
      const slotY = spec.slot * r;
      spec.label.right = labelColumnRight;
      spec.label.centerY = slotY;
      // Leader runs from just right of the text to the target point on the globe.
      spec.leader.setLine(labelColumnRight + 3, slotY, target.x, target.y);
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

        // Rotation axis: from each pole through the centre. The front pole is solid,
        // the far pole faded — the lean of this line is the seasonal tilt cue.
        const ncp = projection.projectWithDepth(NCP);
        const scp = projection.projectWithDepth(SCP);
        northAxis.shape = new Shape().moveTo(0, 0).lineToPoint(ncp.point);
        southAxis.shape = new Shape().moveTo(0, 0).lineToPoint(scp.point);
        northAxis.opacity = ncp.depth >= 0 ? 1 : 0.35;
        southAxis.opacity = scp.depth >= 0 ? 1 : 0.35;

        // Reference-circle / pole labels: stacked left column with leader lines.
        for (const spec of labelSpecs) {
          const target =
            spec.pole === 0
              ? leftmostFrontPoint(spec.lat)
              : (() => {
                  const p = projection.projectWithDepth(spec.pole > 0 ? NCP : SCP);
                  return p.depth >= 0 ? p.point : null;
                })();
          placeLabel(spec, target);
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
