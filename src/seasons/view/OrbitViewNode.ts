/**
 * OrbitViewNode.ts
 *
 * Top-down (foreshortened) view of Earth's orbit: the Sun at the centre, Earth on
 * a circular orbit drawn as an ellipse, and Earth's rotation axis drawn at a
 * FIXED screen direction (tilted 23.4° from the orbit normal) so that the same
 * axis points toward the Sun at the June solstice and away at the December
 * solstice — the key seasons pedagogy. Earth is draggable around the orbit
 * (and arrow-key nudgeable), which sets the Sun's ecliptic longitude.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, DragListener, KeyboardListener, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { CONTROL_FONT_SIZE, OBLIQUITY_DEGREES } from "../../BasicCoordinatesAndSeasonsConstants.js";
import BasicCoordinatesAndSeasonsHotkeyData from "../../common/BasicCoordinatesAndSeasonsHotkeyData.js";
import { type EarthShorePoint, getEarthShorePolygons } from "../../common/model/EarthShoreData.js";
import { degToRad, normalizeDegrees, radToDeg } from "../../common/SkyCoordinates.js";
import { SkyProjection } from "../../common/SkyProjection.js";
import { addFrontHemisphereSphericalPolygon } from "../../common/view/skyGraphics.js";
import { speakValueOnFocus } from "../../common/view/speakValueOnFocus.js";
import type { SeasonsModel } from "../model/SeasonsModel.js";

export type OrbitViewNodeOptions = {
  radius: number;
  /** Vertical foreshortening of the orbit ellipse (1 = circle). */
  foreshorten?: number;
  accessibleName: TReadOnlyProperty<string>;
  accessibleHelpText?: TReadOnlyProperty<string>;
  /** Live date response spoken when a keyboard user nudges Earth around its orbit. */
  accessibleObjectResponseProperty?: TReadOnlyProperty<string>;
  /** Localized season labels at λ☉ = 0/90/180/270 (equinox/solstice points). */
  seasonLabels: { marchEquinox: string; juneSolstice: string; septemberEquinox: string; decemberSolstice: string };
};

const EARTH_RADIUS = 12;
const SUN_RADIUS = 14;
const AXIS_HALF_LENGTH = 18;
const LONGITUDE_STEP = 5;

/** Converts a unit shore-data point (earth-fixed) into an RA-frame direction. */
const shorePointToVector = (point: EarthShorePoint): Vector3 => {
  const lonHours = (Math.atan2(point.y, point.x) / (2 * Math.PI)) * 24;
  const latDeg = radToDeg(Math.asin(point.z));
  const raRad = (lonHours / 24) * 2 * Math.PI;
  const cosLat = Math.cos(degToRad(latDeg));
  return new Vector3(cosLat * Math.cos(raRad), cosLat * Math.sin(raRad), Math.sin(degToRad(latDeg)));
};

export class OrbitViewNode extends Node {
  public constructor(model: SeasonsModel, options: OrbitViewNodeOptions) {
    const radius = options.radius;
    const k = options.foreshorten ?? 0.42;

    // Earth's heliocentric longitude is opposite the Sun's geocentric one. Screen
    // angle φ: +x right, +y up. Earth at (R cosφ, −R k sinφ).
    const earthScreenAngleDeg = (lambdaDeg: number): number => lambdaDeg + 180;
    const earthPosition = (lambdaDeg: number): Vector2 => {
      const phi = degToRad(earthScreenAngleDeg(lambdaDeg));
      return new Vector2(radius * Math.cos(phi), -radius * k * Math.sin(phi));
    };

    const orbitPath = new Path(Shape.ellipse(0, 0, radius, radius * k, 0), {
      stroke: BasicCoordinatesAndSeasonsColors.orbitPathColorProperty,
      lineWidth: 1.5,
    });

    const sun = new Circle(SUN_RADIUS, {
      fill: BasicCoordinatesAndSeasonsColors.sunColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      lineWidth: 1,
    });

    // Season labels just outside the orbit at the four cardinal ecliptic longitudes.
    const labelFont = new PhetFont(CONTROL_FONT_SIZE - 1);
    const makeLabel = (text: string, lambdaDeg: number): Text => {
      const label = new Text(text, { font: labelFont, fill: BasicCoordinatesAndSeasonsColors.textColorProperty });
      const p = earthPosition(lambdaDeg);
      label.center = p.timesScalar(1.32);
      return label;
    };
    const labels = new Node({
      children: [
        makeLabel(options.seasonLabels.marchEquinox, 0),
        makeLabel(options.seasonLabels.juneSolstice, 90),
        makeLabel(options.seasonLabels.septemberEquinox, 180),
        makeLabel(options.seasonLabels.decemberSolstice, 270),
      ],
    });

    // Earth: a small textured globe (ocean + continents) with a tilted N (red) /
    // S (blue) axis, fixed in space. The globe is drawn pole-up in a local
    // orthographic projection, then the whole node is leaned by the obliquity so
    // its axis points 23.4° off vertical (toward +x), matching the NAAP orbit view.
    const tilt = degToRad(OBLIQUITY_DEGREES);

    const ocean = new Circle(EARTH_RADIUS, {
      fill: BasicCoordinatesAndSeasonsColors.earthOceanColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      lineWidth: 1,
    });
    // Fixed pole-up camera, tipped slightly down so the northern continents show.
    const globeProjection = new SkyProjection({
      center: Vector2.ZERO,
      radius: EARTH_RADIUS,
      azimuth: degToRad(200),
      elevation: -0.35,
    });
    const land = new Path(null, {
      fill: BasicCoordinatesAndSeasonsColors.earthLandColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.sphereOutlineColorProperty,
      lineWidth: 0.25,
      clipArea: Shape.circle(0, 0, EARTH_RADIUS),
    });
    const landShape = new Shape();
    for (const polygon of getEarthShorePolygons("low")) {
      addFrontHemisphereSphericalPolygon(
        globeProjection,
        polygon.map(shorePointToVector),
        landShape,
        (v) => globeProjection.project(v),
        Vector2.ZERO,
        EARTH_RADIUS,
      );
    }
    land.shape = landShape;

    // Axis drawn vertical here; the enclosing node's rotation leans it by the tilt.
    const northAxis = new Path(new Shape().moveTo(0, 0).lineTo(0, -AXIS_HALF_LENGTH), {
      stroke: BasicCoordinatesAndSeasonsColors.earthNorthAxisColorProperty,
      lineWidth: 2,
    });
    const southAxis = new Path(new Shape().moveTo(0, 0).lineTo(0, AXIS_HALF_LENGTH), {
      stroke: BasicCoordinatesAndSeasonsColors.earthSouthAxisColorProperty,
      lineWidth: 2,
    });
    const tiltedGlobe = new Node({ children: [southAxis, ocean, land, northAxis], rotation: tilt });

    // Day/night shade: the globe half facing away from the Sun (at the orbit centre).
    // The Sun sits at screen centre, so the lit face always points inward and the
    // night face outward; the half-disc is rotated so its +x half covers the outward
    // (night) hemisphere. Because the polar axis is offset from the disc centre, this
    // flat terminator still shows polar day/night as Earth moves around the orbit.
    const shade = new Path(
      new Shape()
        .moveTo(0, -EARTH_RADIUS)
        .arc(0, 0, EARTH_RADIUS, -Math.PI / 2, Math.PI / 2, false)
        .close(),
      { fill: BasicCoordinatesAndSeasonsColors.terminatorShadeColorProperty, pickable: false },
    );

    const earth = new Node({
      children: [tiltedGlobe, shade],
      cursor: "pointer",
      tagName: "div",
      focusable: true,
      accessibleName: options.accessibleName,
      ...(options.accessibleHelpText && { accessibleHelpText: options.accessibleHelpText }),
    });

    super({ children: [orbitPath, sun, labels, earth] });

    // Speak the date to screen readers as a keyboard user nudges Earth around its orbit.
    if (options.accessibleObjectResponseProperty) {
      speakValueOnFocus(earth, options.accessibleObjectResponseProperty);
    }

    Multilink.multilink([model.sunEclipticLongitudeProperty], (lambda) => {
      const position = earthPosition(lambda);
      earth.translation = position;
      // Point the shade's +x (night) half outward, away from the Sun at the centre.
      shade.rotation = Math.atan2(position.y, position.x);
    });

    const setLongitudeFromPoint = (globalPoint: Vector2): void => {
      const local = this.globalToLocalPoint(globalPoint);
      // Screen angle φ (with +y up): atan2(−y, x); Earth angle = λ + 180.
      const phiDeg = normalizeDegrees((Math.atan2(-local.y, local.x) * 180) / Math.PI);
      model.sunEclipticLongitudeProperty.value = normalizeDegrees(phiDeg - 180);
    };

    earth.addInputListener(new DragListener({ drag: (event) => setLongitudeFromPoint(event.pointer.point) }));
    earth.addInputListener(
      new KeyboardListener({
        keys: [...BasicCoordinatesAndSeasonsHotkeyData.ARROW_KEYS],
        fireOnHold: true,
        fire: (_event, keysPressed) => {
          const current = model.sunEclipticLongitudeProperty.value;
          if (keysPressed === "arrowRight" || keysPressed === "arrowUp") {
            model.sunEclipticLongitudeProperty.value = normalizeDegrees(current + LONGITUDE_STEP);
          } else if (keysPressed === "arrowLeft" || keysPressed === "arrowDown") {
            model.sunEclipticLongitudeProperty.value = normalizeDegrees(current - LONGITUDE_STEP);
          }
        },
      }),
    );
  }
}
