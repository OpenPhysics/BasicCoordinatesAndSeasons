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
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, DragListener, KeyboardListener, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { CONTROL_FONT_SIZE, OBLIQUITY_DEGREES } from "../../BasicCoordinatesAndSeasonsConstants.js";
import BasicCoordinatesAndSeasonsHotkeyData from "../../common/BasicCoordinatesAndSeasonsHotkeyData.js";
import { degToRad, normalizeDegrees } from "../../common/SkyCoordinates.js";
import type { SeasonsModel } from "../model/SeasonsModel.js";

export type OrbitViewNodeOptions = {
  radius: number;
  /** Vertical foreshortening of the orbit ellipse (1 = circle). */
  foreshorten?: number;
  accessibleName: TReadOnlyProperty<string>;
  accessibleHelpText?: TReadOnlyProperty<string>;
  /** Localized season labels at λ☉ = 0/90/180/270 (equinox/solstice points). */
  seasonLabels: { marchEquinox: string; juneSolstice: string; septemberEquinox: string; decemberSolstice: string };
};

const EARTH_RADIUS = 9;
const SUN_RADIUS = 14;
const AXIS_HALF_LENGTH = 16;
const LONGITUDE_STEP = 5;

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

    // Earth: a small blue globe with a tilted N (red) / S (blue) axis, fixed in space.
    const earthGlobe = new Circle(EARTH_RADIUS, {
      fill: BasicCoordinatesAndSeasonsColors.earthOceanColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      lineWidth: 1,
    });
    // Fixed screen axis direction (N pole up, tilted 23.4° toward +x).
    const tilt = degToRad(OBLIQUITY_DEGREES);
    const axisUnit = new Vector2(Math.sin(tilt), -Math.cos(tilt));
    const northAxis = new Path(
      new Shape().moveTo(0, 0).lineTo(axisUnit.x * AXIS_HALF_LENGTH, axisUnit.y * AXIS_HALF_LENGTH),
      { stroke: "#ff5252", lineWidth: 2 },
    );
    const southAxis = new Path(
      new Shape().moveTo(0, 0).lineTo(-axisUnit.x * AXIS_HALF_LENGTH, -axisUnit.y * AXIS_HALF_LENGTH),
      { stroke: "#5b8dd6", lineWidth: 2 },
    );
    const earth = new Node({
      children: [southAxis, earthGlobe, northAxis],
      cursor: "pointer",
      tagName: "div",
      focusable: true,
      accessibleName: options.accessibleName,
      ...(options.accessibleHelpText && { accessibleHelpText: options.accessibleHelpText }),
    });

    super({ children: [orbitPath, sun, labels, earth] });

    Multilink.multilink([model.sunEclipticLongitudeProperty], (lambda) => {
      earth.translation = earthPosition(lambda);
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
