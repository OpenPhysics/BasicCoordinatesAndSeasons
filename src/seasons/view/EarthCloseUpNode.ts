/**
 * EarthCloseUpNode.ts
 *
 * A side-on close-up of the Earth with the Sun far to the right (horizontal
 * parallel rays). The day hemisphere is the right half, night the left, split by
 * a vertical terminator. The latitude grid (equator + tropics) is tilted by the
 * Sun's declination δ, so the subsolar point (screen-rightmost, sun overhead)
 * sits at latitude δ; the observer marker rides the sunward limb at latitude φ,
 * where the angle between the horizontal ray and the local vertical is the noon
 * Sun altitude 90° − |φ − δ|.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Matrix3, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, DragListener, KeyboardListener, Node, Path, Text } from "scenerystack/scenery";
import { ArrowNode, PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { LATITUDE_RANGE, LOCATION_STEP_DEGREES, OBLIQUITY_DEGREES } from "../../BasicCoordinatesAndSeasonsConstants.js";
import BasicCoordinatesAndSeasonsHotkeyData from "../../common/BasicCoordinatesAndSeasonsHotkeyData.js";
import { degToRad, radToDeg } from "../../common/SkyCoordinates.js";
import { StickFigureNode } from "../../common/view/StickFigureNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { SeasonsModel } from "../model/SeasonsModel.js";

const POLAR_CIRCLE_LAT = 90 - OBLIQUITY_DEGREES;

export type EarthCloseUpNodeOptions = {
  radius: number;
  accessibleName?: TReadOnlyProperty<string>;
  accessibleHelpText?: TReadOnlyProperty<string>;
};

const clampLatitude = (lat: number): number => Math.max(LATITUDE_RANGE.min, Math.min(LATITUDE_RANGE.max, lat));

/** A latitude small-circle projected onto the side view as an ellipse. */
const latitudeEllipse = (radius: number, latitudeDeg: number): Shape => {
  const lat = degToRad(latitudeDeg);
  const ringRadius = radius * Math.cos(lat); // half-width of the parallel
  const centerY = -radius * Math.sin(lat); // height of the parallel's centre
  // Edge-on, a parallel projects to a thin ellipse (vertical semi-axis ≈ 18% width).
  return Shape.ellipse(0, centerY, ringRadius, ringRadius * 0.18, 0);
};

export class EarthCloseUpNode extends Node {
  public constructor(model: SeasonsModel, options: EarthCloseUpNodeOptions) {
    const r = options.radius;

    const earth = new Circle(r, {
      fill: BasicCoordinatesAndSeasonsColors.earthOceanColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      lineWidth: 1,
    });

    // Night hemisphere: the left half (terminator is the vertical diameter).
    const night = new Path(
      new Shape()
        .moveTo(0, -r)
        .arc(0, 0, r, -Math.PI / 2, Math.PI / 2, true)
        .close(),
      { fill: BasicCoordinatesAndSeasonsColors.terminatorShadeColorProperty },
    );

    // Tilted latitude grid (rotated by δ), redrawn each frame.
    const grid = new Path(null, {
      stroke: BasicCoordinatesAndSeasonsColors.gridColorProperty,
      lineWidth: 0.75,
      opacity: 0.8,
    });
    const northAxis = new Path(null, { stroke: "#ff5252", lineWidth: 2 });
    const southAxis = new Path(null, { stroke: "#5b8dd6", lineWidth: 2 });

    // Sun rays from the right: parallel arrows striking the sunward limb.
    const rayLayer = new Node({
      children: [-0.6, -0.2, 0.2, 0.6].map((yFrac) => {
        const y = yFrac * r;
        return new ArrowNode(r + 52, y, r + 6, y, {
          fill: BasicCoordinatesAndSeasonsColors.sunbeamColorProperty,
          stroke: null,
          headWidth: 10,
          headHeight: 11,
          tailWidth: 3.5,
        });
      }),
    });

    const subsolarDot = new Circle(4, {
      fill: BasicCoordinatesAndSeasonsColors.sunColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty,
      lineWidth: 0.5,
    });

    // Reference-circle labels (equator, tropics, polar circles, poles), toggled by
    // the earth-view "labels" checkbox and pinned to the sunward side of each
    // tilted parallel so they ride along as the Sun's declination changes.
    const controls = StringManager.getInstance().getControls();
    const labelFont = new PhetFont(9);
    const labelColor = BasicCoordinatesAndSeasonsColors.cardinalLabelColorProperty;
    const makeLabel = (property: TReadOnlyProperty<string>): Text =>
      new Text(property, { font: labelFont, fill: labelColor, maxWidth: 90 });
    const circleLabels: { label: Text; lat: number }[] = [
      { label: makeLabel(controls.arcticCircleStringProperty), lat: POLAR_CIRCLE_LAT },
      { label: makeLabel(controls.tropicOfCancerStringProperty), lat: OBLIQUITY_DEGREES },
      { label: makeLabel(controls.equatorStringProperty), lat: 0 },
      { label: makeLabel(controls.tropicOfCapricornStringProperty), lat: -OBLIQUITY_DEGREES },
      { label: makeLabel(controls.antarcticCircleStringProperty), lat: -POLAR_CIRCLE_LAT },
    ];
    const labelsLayer = new Node({ children: circleLabels.map((c) => c.label) });
    model.earthLabelsVisibleProperty.link((visible) => {
      labelsLayer.visible = visible;
    });

    // Observer: a stick figure standing on the sunward limb (feet on the surface,
    // head pointing along the local vertical), draggable to change the latitude.
    const observer = new StickFigureNode({
      height: 22,
      cursor: "pointer",
      tagName: "div",
      focusable: true,
      ...(options.accessibleName && { accessibleName: options.accessibleName }),
      ...(options.accessibleHelpText && { accessibleHelpText: options.accessibleHelpText }),
    });

    super({ children: [earth, night, grid, southAxis, northAxis, rayLayer, subsolarDot, labelsLayer, observer] });

    Multilink.multilink(
      [model.sunDeclinationProperty, model.latitudeProperty, model.subsolarPointVisibleProperty],
      (dec, latitude, subsolarVisible) => {
        const tilt = degToRad(dec); // N pole leans toward the Sun (right) by δ.
        const rot = Matrix3.rotationZ(tilt);

        // Latitude grid: equator + tropics + polar circles, tilted by δ.
        const gridShape = new Shape();
        for (const lat of [0, OBLIQUITY_DEGREES, -OBLIQUITY_DEGREES, POLAR_CIRCLE_LAT, -POLAR_CIRCLE_LAT]) {
          gridShape.subpaths.push(...latitudeEllipse(r, lat).transformed(rot).subpaths);
        }
        grid.shape = gridShape;

        // Reference-circle labels ride the sunward side of each parallel, stacked
        // along the tilted axis; poles sit at the axis tips.
        for (const { label, lat } of circleLabels) {
          const latRad = degToRad(lat);
          const local = new Vector2(r * Math.cos(latRad) * 0.62, -r * Math.sin(latRad));
          label.center = rot.timesVector2(local);
        }

        // Rotation axis, tilted by δ.
        const north = rot.timesVector2(new Vector2(0, -r));
        northAxis.shape = new Shape().moveTo(0, 0).lineTo(north.x, north.y);
        southAxis.shape = new Shape().moveTo(0, 0).lineTo(-north.x, -north.y);

        // Subsolar point: sun overhead → screen-rightmost point (latitude δ).
        subsolarDot.center = new Vector2(r, 0);
        subsolarDot.visible = subsolarVisible;

        // Observer at latitude φ on the sunward limb: screen angle (φ − δ) from horizontal.
        // Plant the feet on the limb and rotate so the figure's head (local −y) points
        // radially outward (the local vertical); rotating (0,−1) by (π/2 − β) does this.
        const beta = degToRad(latitude - dec);
        observer.matrix = Matrix3.translation(r * Math.cos(beta), -r * Math.sin(beta)).timesMatrix(
          Matrix3.rotationZ(Math.PI / 2 - beta),
        );
      },
    );

    // Drag / arrow-keys move the observer around the sunward limb to set the latitude.
    const setLatitudeFromPoint = (globalPoint: Vector2): void => {
      const local = this.globalToLocalPoint(globalPoint);
      // screen angle β = atan2(−y, x) = φ − δ  ⇒  φ = δ + β.
      const betaDeg = radToDeg(Math.atan2(-local.y, local.x));
      model.latitudeProperty.value = clampLatitude(model.sunDeclinationProperty.value + betaDeg);
    };
    observer.addInputListener(new DragListener({ drag: (event) => setLatitudeFromPoint(event.pointer.point) }));
    observer.addInputListener(
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
