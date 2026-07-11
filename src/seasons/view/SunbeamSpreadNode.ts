/**
 * SunbeamSpreadNode.ts
 *
 * The "sunbeam spread" panel (NAAP's top-down sunbeam view): the ground seen from
 * directly above with a reference grid, and a fixed-cross-section beam of
 * sunlight painting a footprint on it. Overhead (h = 90°) the footprint is a
 * circle; as the noon Sun altitude h drops, the same beam smears into an ellipse
 * whose along-Sun axis grows as 1/sin(h) — so the light (and warmth) is spread
 * ever more thinly. The footprint fades out during polar night (h ≤ 0).
 */

import { DerivedProperty, Multilink } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import BasicCoordinatesAndSeasonsColors from "../../BasicCoordinatesAndSeasonsColors.js";
import { CONTROL_FONT_SIZE } from "../../BasicCoordinatesAndSeasonsConstants.js";
import { degToRad } from "../../common/SkyCoordinates.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { SeasonsModel } from "../model/SeasonsModel.js";

export type SunbeamSpreadNodeOptions = { width: number; height: number };

export class SunbeamSpreadNode extends Node {
  public constructor(model: SeasonsModel, options: SunbeamSpreadNodeOptions) {
    const { width, height } = options;
    const controls = StringManager.getInstance().getControls();
    const font = new PhetFont(CONTROL_FONT_SIZE);

    const cx = width / 2;
    const cy = height / 2 + 8;
    const beamRadius = Math.round(width * 0.085);
    const maxHalfLength = height / 2 - 6;

    // Top-down ground with a reference grid.
    const ground = new Rectangle(0, 0, width, height, {
      fill: BasicCoordinatesAndSeasonsColors.sunbeamGroundColorProperty,
    });
    const gridShape = new Shape();
    for (let x = cx % beamRadius; x <= width; x += beamRadius) {
      gridShape.moveTo(x, 0).lineTo(x, height);
    }
    for (let y = cy % beamRadius; y <= height; y += beamRadius) {
      gridShape.moveTo(0, y).lineTo(width, y);
    }
    const grid = new Path(gridShape, { stroke: "rgba(255,255,255,0.18)", lineWidth: 0.75 });

    // The beam's true cross-section (dashed circle) and its spread footprint (ellipse).
    const beamCrossSection = new Path(Shape.circle(cx, cy, beamRadius), {
      stroke: BasicCoordinatesAndSeasonsColors.sunbeamColorProperty,
      lineWidth: 1,
      lineDash: [3, 3],
    });
    const footprint = new Path(null, {
      fill: "rgba(255,245,157,0.5)",
      stroke: BasicCoordinatesAndSeasonsColors.sunbeamColorProperty,
      lineWidth: 1.5,
    });

    // Readout box (top-right): Sun's altitude + observer latitude.
    const readoutTextFill = BasicCoordinatesAndSeasonsColors.controlSurfaceTextColorProperty;
    const altitudeText = new Text("", { font, fill: readoutTextFill });
    const latitudeText = new Text("", { font, fill: readoutTextFill });
    const readoutContent = new VBox({ align: "left", spacing: 2, children: [altitudeText, latitudeText] });
    const readoutBox = new Rectangle(0, 0, 0, 0, {
      fill: BasicCoordinatesAndSeasonsColors.controlSurfaceColorProperty,
      stroke: BasicCoordinatesAndSeasonsColors.panelBorderColorProperty,
      cornerRadius: 4,
    });
    const readout = new Node({ children: [readoutBox, readoutContent] });

    super({ children: [ground, grid, footprint, beamCrossSection, readout] });

    const altitudeStringProperty = new DerivedProperty(
      [controls.sunAltitudeStringProperty, model.noonSunAltitudeProperty],
      (label, altitude) => `${label}: ${toFixed(altitude, 1)}°`,
    );
    const latitudeStringProperty = new DerivedProperty(
      [
        controls.observerLatitudeStringProperty,
        controls.northStringProperty,
        controls.southStringProperty,
        model.latitudeProperty,
      ],
      (label, north, south, lat) => `${label}: ${toFixed(Math.abs(lat), 1)}° ${lat >= 0 ? north : south}`,
    );
    altitudeStringProperty.link((s) => {
      altitudeText.string = s;
    });
    latitudeStringProperty.link((s) => {
      latitudeText.string = s;
    });
    readoutContent.boundsProperty.link(() => {
      const pad = 6;
      readoutBox.setRect(0, 0, readoutContent.width + pad * 2, readoutContent.height + pad * 2);
      readoutContent.left = pad;
      readoutContent.top = pad;
      readout.right = width - 8;
      readout.top = 8;
    });

    Multilink.multilink([model.noonSunAltitudeProperty], (altitude) => {
      const lit = altitude > 0;
      footprint.visible = lit;
      beamCrossSection.visible = lit;
      if (!lit) {
        return;
      }
      // Footprint stretches along the Sun's azimuth (drawn vertically, toward the pole).
      const halfLength = Math.min(maxHalfLength, beamRadius / Math.sin(degToRad(altitude)));
      footprint.shape = Shape.ellipse(cx, cy, beamRadius, halfLength, 0);
    });
  }
}
